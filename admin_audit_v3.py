from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Signup...")
        page.goto("https://www.pulseearn.online/signup")
        page.wait_for_timeout(2000)

        print("Filling Signup Form...")
        page.fill('input[placeholder*="Username"]', 'AuditTestUser')
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.screenshot(path="signup_filled.png")

        print("Clicking Signup...")
        page.click('button[type="submit"]')

        page.wait_for_timeout(10000)

        print(f"URL after signup: {page.url}")
        page.screenshot(path="signup_result.png")

        # Check console for errors
        browser.close()

if __name__ == "__main__":
    run_audit()
