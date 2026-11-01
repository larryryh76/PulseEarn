"""PSEmine hosted-checkout migration and legacy wallet retirement guards."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]
API = (ROOT / "api" / "index.py").read_text(encoding="utf-8")
PUBLIC = (ROOT / "api" / "psemine_public.py").read_text(encoding="utf-8")
ENGINE = (ROOT / "api" / "psemine_engine.py").read_text(encoding="utf-8")
TOOLS = (ROOT / "src" / "pages" / "psemine" / "PSEMineTools.tsx").read_text(encoding="utf-8")
WALLET = (ROOT / "src" / "pages" / "psemine" / "PSEMineWallet.tsx").read_text(encoding="utf-8")
CONTEXT = (ROOT / "src" / "contexts" / "PSEMineContext.tsx").read_text(encoding="utf-8")
ADMIN = (ROOT / "src" / "pages" / "admin" / "AdminPSEMine.tsx").read_text(encoding="utf-8")
PSE_API = (ROOT / "src" / "engines" / "psemine" / "pseMineApi.ts").read_text(encoding="utf-8")


class TestPSEMineHostedCheckoutMigration(unittest.TestCase):
    def test_hosted_invoice_and_provider_reconciliation_are_registered(self):
        self.assertIn("@app.route('/api/mine/payments/v2/invoices', methods=['POST'])", API)
        self.assertIn("@app.route('/api/mine/payments/v2/nowpayments/ipn', methods=['POST'])", API)
        self.assertIn("@app.route('/api/mine/payments/v2/reconcile', methods=['POST'])", API)
        self.assertIn("def reconcile_nowpayments_order(", API)
        self.assertIn("verify_ipn_signature(payload, signature, secret)", API)
        self.assertIn("settle_provider_purchase(db, uid", API)
        self.assertIn("psemine_provider_redemptions", ENGINE)

    def test_old_direct_wallet_purchase_routes_are_retired(self):
        routes = (
            "/api/psemine/orders/verify-payment",
            "/api/mine/tools/quote",
            "/api/mine/tools/verify-purchase",
            "/api/mine/purchases/create",
            "/api/mine/purchases/mark-uncertain",
            "/api/mine/purchases/report-submission",
            "/api/mine/purchases/resolve-no-broadcast",
        )
        for route in routes:
            start = API.index(f"@app.route('{route}'")
            next_route = API.find("\n@app.route(", start + 1)
            handler = API[start: next_route if next_route >= 0 else len(API)]
            self.assertIn('"error": "PAYMENT_FLOW_RETIRED"', handler, route)
            self.assertIn("}), 410", handler, route)

    def test_campaign_purchase_gate_is_provider_and_admin_controlled(self):
        self.assertIn("if action == 'set_purchase_enabled':", API)
        self.assertIn("NOWPAYMENTS_API_KEY", API)
        self.assertIn("NOWPAYMENTS_IPN_SECRET", API)
        self.assertIn("verify_merchant_account", API)
        self.assertIn("if current_status != 'active':", API)
        self.assertIn('"purchaseEnabled": enabled', API)
        self.assertIn("paymentProviderConfigured", API)

    def test_old_receiver_wallet_admin_action_is_retired(self):
        self.assertIn("if action == 'set_receiver_wallet':", API)
        receiver_action = API.split("if action == 'set_receiver_wallet':", 1)[1].split("if action == 'schedule':", 1)[0]
        self.assertIn('"error": "PAYMENT_FLOW_RETIRED"', receiver_action)
        self.assertNotIn('"receiverWalletAddress": receiver_address', receiver_action)

    def test_public_and_authenticated_user_payloads_hide_legacy_wallet_binding(self):
        self.assertNotIn("'receiverWalletAddress'", PUBLIC)
        self.assertNotIn("'paymentChainId'", PUBLIC)
        self.assertNotIn('"connectedWallet": u.get', API)
        self.assertNotIn('"pendingPurchases": pending_purchases', API)

    def test_purchase_ui_and_context_have_no_wallet_connect_or_direct_send_path(self):
        for source in (TOOLS, WALLET, CONTEXT):
            self.assertNotIn("connectWallet", source)
            self.assertNotIn("WalletConnect", source)
            self.assertNotIn("sendPayment", source)
            self.assertNotIn("ensurePaymentChain", source)
        self.assertIn("createHostedPaymentInvoice", TOOLS)
        self.assertIn("fetchHostedPaymentStatus", TOOLS)

    def test_admin_revenue_comes_from_settled_v2_orders_only(self):
        self.assertIn("psemine_payment_orders_v2", API)
        self.assertIn('row.get("status") != "paid"', API)
        self.assertIn('"totalToolIncomeGbp": tool_income_gbp', API)
        self.assertIn("paymentProviderConfigured", ADMIN)
        self.assertNotIn("Purchase receiving wallet", ADMIN)
        self.assertNotIn("saveWallet", ADMIN)

    def test_user_payout_pipeline_remains_separate_from_purchase_checkout(self):
        withdrawal_start = API.index("def mine_create_withdrawal():")
        withdrawal_end = API.index("\n@app.route(", withdrawal_start)
        withdrawal = API[withdrawal_start:withdrawal_end]
        self.assertIn("fetch_psemine_bnb_gbp_quote()", withdrawal)
        self.assertIn("expectedAmountWei", withdrawal)
        self.assertIn('"amountBnb": payout_quote["amountBnb"]', withdrawal)
        review_start = API.index("def admin_psemine_review_withdrawal(")
        review_end = API.index("\n@app.route(", review_start)
        review = API[review_start:review_end]
        self.assertIn("PAYOUT_INSUFFICIENT_CONFIRMATIONS", review)
        self.assertIn("PAYOUT_AMOUNT_MISMATCH", review)
        self.assertIn("payout_block", review)
        self.assertIn("txn.set(_tx_doc", review)
        self.assertIn("Locked payout amount", WALLET)
        self.assertIn("Locked conversion rate", WALLET)
        self.assertIn("amountBnb?: string | number", PSE_API)

    def test_legacy_recovery_routes_are_preserved_for_audit(self):
        self.assertIn("@app.route('/api/admin/mine/payment-recovery', methods=['GET'])", API)
        self.assertIn("@app.route('/api/admin/mine/payment-recovery/<recovery_id>/resolve', methods=['POST'])", API)
        self.assertIn("psemine_payment_recovery", ENGINE)


if __name__ == "__main__":
    unittest.main()
