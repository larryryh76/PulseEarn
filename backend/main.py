from __future__ import annotations

import json
import os
from decimal import Decimal, InvalidOperation, ROUND_DOWN
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import JSONResponse
from firebase_admin import auth, credentials, firestore, initialize_app, get_app
from pydantic import BaseModel, Field
from web3 import Web3

PAYMENT_ADDRESS = Web3.to_checksum_address("0xAE909dDcf7e38F7Ed866c17D7245b36E8077dc77")
BSC_CHAIN_ID = 56
QUOTE_TTL_MINUTES = 15
GBP_SCALE = Decimal("0.000000000000000001")

try:
    get_app()
except ValueError:
    service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if not service_account:
        raise RuntimeError("FIREBASE_SERVICE_ACCOUNT is required for the payment service")
    initialize_app(credentials.Certificate(json.loads(service_account)))

db = firestore.client()
app = FastAPI(title="PSEmine payment service", version="0.1.0")

class OrderRequest(BaseModel):
    tool_id: str = Field(min_length=1, max_length=120)

class PaymentVerificationRequest(BaseModel):
    order_id: str = Field(min_length=1, max_length=120)
    tx_hash: str = Field(pattern=r"^0x[a-fA-F0-9]{64}$")

class ApiError(BaseModel):
    status: str = "error"
    code: str
    message: str

@app.exception_handler(HTTPException)
async def http_error_handler(_, exc: HTTPException):
    detail = exc.detail if isinstance(exc.detail, dict) else {"code": "request_failed", "message": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content={"status": "error", **detail})

async def current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, {"code": "unauthenticated", "message": "A Firebase ID token is required."})
    try:
        return auth.verify_id_token(authorization.removeprefix("Bearer "))
    except Exception as exc:
        raise HTTPException(401, {"code": "invalid_token", "message": "The Firebase ID token is invalid or expired."}) from exc

async def bnb_gbp_quote() -> tuple[Decimal, str]:
    provider = os.environ.get("PSEMINE_QUOTE_PROVIDER", "coingecko")
    if provider != "coingecko":
        raise HTTPException(503, {"code": "quote_provider_unavailable", "message": "Configured quote provider is unavailable."})
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get("https://api.coingecko.com/api/v3/simple/price", params={"ids": "binancecoin", "vs_currencies": "gbp"})
            response.raise_for_status()
            price = Decimal(str(response.json()["binancecoin"]["gbp"]))
            if price <= 0:
                raise InvalidOperation
            return price, provider
    except (httpx.HTTPError, KeyError, InvalidOperation) as exc:
        raise HTTPException(503, {"code": "quote_unavailable", "message": "A live BNB/GBP quote could not be obtained."}) from exc

def user_id_from_token(token: dict[str, Any]) -> str:
    return str(token["uid"])

def order_ref(user_id: str, order_id: str):
    return db.collection("psemine_orders").document(order_id)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "psemine-payment-service"}

@app.post("/orders")
async def create_order(payload: OrderRequest, token: dict[str, Any] = Depends(current_user)):
    user_id = user_id_from_token(token)
    tool_snapshot = db.collection("psemine_tools").document(payload.tool_id).get()
    if not tool_snapshot.exists:
        raise HTTPException(404, {"code": "tool_not_found", "message": "The requested PSEmine tool does not exist."})
    tool = tool_snapshot.to_dict() or {}
    if tool.get("status") != "active":
        raise HTTPException(409, {"code": "tool_unavailable", "message": "This tool is not available for purchase."})
    try:
        gbp_price = Decimal(str(tool["priceGbp"]))
    except (KeyError, InvalidOperation) as exc:
        raise HTTPException(500, {"code": "invalid_tool_configuration", "message": "Tool pricing is not configured correctly."}) from exc
    quote, provider = await bnb_gbp_quote()
    amount_bnb = (gbp_price / quote).quantize(GBP_SCALE, rounding=ROUND_DOWN)
    amount_wei = int(amount_bnb * Decimal(10**18))
    now = datetime.now(timezone.utc)
    expires = now + timedelta(minutes=QUOTE_TTL_MINUTES)
    ref = db.collection("psemine_orders").document()
    ref.set({"userId": user_id, "toolId": payload.tool_id, "status": "quoted", "asset": "BNB", "chainId": BSC_CHAIN_ID, "destination": PAYMENT_ADDRESS, "priceGbp": str(gbp_price), "quoteBnbPerGbp": str((Decimal(1) / quote).quantize(GBP_SCALE)), "bnbGbpPrice": str(quote), "amountBnb": str(amount_bnb), "amountWei": str(amount_wei), "quoteProvider": provider, "quotedAt": now, "expiresAt": expires, "createdAt": now})
    return {"status": "quoted", "orderId": ref.id, "toolId": payload.tool_id, "priceGbp": str(gbp_price), "asset": "BNB", "chainId": BSC_CHAIN_ID, "destination": PAYMENT_ADDRESS, "amountBnb": str(amount_bnb), "amountWei": str(amount_wei), "quotedAt": now.isoformat(), "expiresAt": expires.isoformat()}

@app.post("/verify-payment")
async def verify_payment(payload: PaymentVerificationRequest, token: dict[str, Any] = Depends(current_user)):
    user_id = user_id_from_token(token)
    ref = order_ref(user_id, payload.order_id)
    snapshot = ref.get()
    if not snapshot.exists:
        raise HTTPException(404, {"code": "order_not_found", "message": "The order does not exist."})
    order = snapshot.to_dict() or {}
    if order.get("userId") != user_id:
        raise HTTPException(403, {"code": "forbidden", "message": "This order does not belong to the authenticated user."})
    if order.get("status") == "confirmed":
        raise HTTPException(409, {"code": "order_already_paid", "message": "This order has already been paid."})
    if order.get("expiresAt") and order["expiresAt"] < datetime.now(timezone.utc):
        ref.update({"status": "expired"})
        raise HTTPException(409, {"code": "order_expired", "message": "The quote has expired. Create a new order."})
    duplicate = db.collection("psemine_payments").where("txHash", "==", payload.tx_hash).limit(1).get()
    if duplicate:
        raise HTTPException(409, {"code": "transaction_reused", "message": "This transaction has already been consumed."})
    w3 = Web3(Web3.HTTPProvider(os.environ.get("PSEMINE_BSC_RPC_URL", "https://bsc-dataseed.binance.org/")))
    if w3.eth.chain_id != BSC_CHAIN_ID:
        raise HTTPException(503, {"code": "wrong_verifier_network", "message": "The verification service is not connected to BNB Smart Chain."})
    try:
        tx = w3.eth.get_transaction(payload.tx_hash)
        receipt = w3.eth.get_transaction_receipt(payload.tx_hash)
    except Exception as exc:
        raise HTTPException(422, {"code": "transaction_unavailable", "message": "The transaction could not be found yet."}) from exc
    if receipt.status != 1 or Web3.to_checksum_address(tx["to"]) != Web3.to_checksum_address(order["destination"]) or int(tx["value"]) != int(order["amountWei"]):
        raise HTTPException(422, {"code": "payment_mismatch", "message": "The transaction does not match the locked order."})
    now = datetime.now(timezone.utc)
    payment_ref = db.collection("psemine_payments").document()
    payment_ref.set({"orderId": ref.id, "userId": user_id, "toolId": order["toolId"], "txHash": payload.tx_hash, "amountWei": order["amountWei"], "amountBnb": order["amountBnb"], "asset": "BNB", "chainId": BSC_CHAIN_ID, "destination": order["destination"], "blockNumber": receipt.blockNumber, "status": "confirmed", "createdAt": now, "confirmedAt": now})
    ref.update({"status": "confirmed", "txHash": payload.tx_hash, "confirmedAt": now})
    return {"status": "confirmed", "orderId": ref.id, "paymentId": payment_ref.id}
