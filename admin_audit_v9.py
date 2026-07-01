from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to verify-email for audit_test...")
        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')
        page.wait_for_timeout(5000)

        if "/verify-email" in page.url:
            print("On verify-email page. Attempting to click 'I have verified my email'.")
            check_btn = page.query_selector('button:has-text("I have verified my email")')
            if check_btn:
                check_btn.click()
                print("Clicked Check Status.")
                page.wait_for_timeout(5000)
                # Should stay on page if not verified
                print(f"URL after check: {page.url}")
                page.screenshot(path="verify_email_check_clicked.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
