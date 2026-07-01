from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Testing referral code lookup endpoint (v2)...")
        api_request_context = p.request.new_context(base_url="https://www.pulseearn.online")
        res = api_request_context.post("/api/referrals/lookup", data={"referralCode": "PULSE-INVALID"})
        print(f"Status: {res.status}")
        print(f"Body: {res.text()[:200]}")

        browser.close()

if __name__ == "__main__":
    run_audit()
