from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Signup...")
        page.goto("https://www.pulseearn.online/signup")
        page.wait_for_timeout(2000)

        print("Filling Signup Form using name attributes...")
        page.fill('input[name="username"]', 'AuditTestUser')
        page.fill('input[name="email"]', 'audit_test@pulseearn.online')
        page.fill('input[name="password"]', 'AuditPass123!')
        page.fill('input[name="confirmPassword"]', 'AuditPass123!')
        page.screenshot(path="signup_filled_v4.png")

        print("Clicking Signup...")
        page.click('button[type="submit"]')

        # Wait for potential toast or navigation
        page.wait_for_timeout(10000)

        print(f"URL after signup: {page.url}")
        page.screenshot(path="signup_result_v4.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
