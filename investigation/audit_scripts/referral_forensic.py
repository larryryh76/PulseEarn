from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'admin@pulse.com')
        page.fill('input[type="password"]', 'dereal01')
        page.click('button[type="submit"]')
        page.wait_for_url("**/admin/**", timeout=15000)

        print("\n--- Auditing Referral Data in Admin ---")
        # Check users directory for referredBy fields
        page.goto("https://www.pulseearn.online/admin/users")
        page.wait_for_timeout(5000)

        # We'll just screenshot to see the list state
        page.screenshot(path="referral_audit_users.png")

        # Logic check: Referral counts are likely 0 because the API lookup is failing.
        # Let's verify the frontend logic for referral display.
        browser.close()

if __name__ == "__main__":
    run_audit()
