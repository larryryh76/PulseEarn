from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Testing Registration Journey...")
        page.goto("https://www.pulseearn.online/signup")
        page.fill('input[name="username"]', 'AuditUserJourney')
        page.fill('input[name="email"]', 'journey_test@pulseearn.online')
        page.fill('input[name="password"]', 'AuditPass123!')
        page.fill('input[name="confirmPassword"]', 'AuditPass123!')
        page.click('button[type="submit"]')
        page.wait_for_timeout(5000)
        print(f"URL after registration: {page.url}")

        print("\nTesting Dashboard blockage...")
        page.goto("https://www.pulseearn.online/dashboard")
        page.wait_for_timeout(3000)
        print(f"URL: {page.url}")

        print("\nTesting Tasks blockage...")
        page.goto("https://www.pulseearn.online/tasks")
        page.wait_for_timeout(3000)
        print(f"URL: {page.url}")

        browser.close()

if __name__ == "__main__":
    run_audit()
