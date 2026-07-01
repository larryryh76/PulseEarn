from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Checking if /admin is reachable for audit_test (should be blocked)...")
        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')
        page.wait_for_timeout(5000)

        page.goto("https://www.pulseearn.online/admin")
        page.wait_for_timeout(3000)
        print(f"URL: {page.url}")

        # If it doesn't redirect, it's a security risk
        if "/admin" in page.url:
            print("CRITICAL: /admin is reachable for unverified/non-admin user!")
        else:
            print("Access to /admin blocked as expected.")

        browser.close()

if __name__ == "__main__":
    run_audit()
