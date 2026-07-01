from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Testing Welcome Bonus flow for audit_test (should be automatic but let's check profile)...")
        # I'll check the users collection for audit_test if I can?
        # No, but I can check the dashboard if I can bypass verify-email (I can't).

        # Checking task reward endpoint
        print("Probing /api/tasks/submit (POST)...")
        api_request_context = p.request.new_context(base_url="https://www.pulseearn.online")
        res = api_request_context.post("/api/tasks/submit")
        print(f"Status: {res.status}")
        print(f"Body: {res.text()[:100]}")

        browser.close()

if __name__ == "__main__":
    run_audit()
