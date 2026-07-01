from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Testing Support Center access (logged in as audit_test)...")
        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')
        page.wait_for_timeout(5000)

        page.goto("https://www.pulseearn.online/support")
        page.wait_for_timeout(3000)
        print(f"URL: {page.url}")
        page.screenshot(path="support_page.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
