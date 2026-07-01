from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Probing /api/authorize-resend (POST)...")
        api_request_context = p.request.new_context(base_url="https://www.pulseearn.online")
        res = api_request_context.post("/api/authorize-resend")
        print(f"Status: {res.status}")
        print(f"Body: {res.text()[:100]}")

        browser.close()

if __name__ == "__main__":
    run_audit()
