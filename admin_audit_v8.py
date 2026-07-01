from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Login...")
        page.goto("https://www.pulseearn.online/login")
        page.wait_for_timeout(2000)

        print("Attempting login for audit_test...")
        # Login.tsx inputs don't have name attributes, using placeholder or type
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')

        page.wait_for_timeout(5000)
        print(f"URL: {page.url}")

        if "/verify-email" in page.url:
            print("On verify-email page. Attempting to click Resend Email.")
            resend_btn = page.query_selector('button:has-text("Resend Email")')
            if resend_btn:
                resend_btn.click()
                print("Clicked Resend Email.")
                page.wait_for_timeout(5000)
                page.screenshot(path="verify_email_clicked_v8.png")
            else:
                print("Resend Email button not found.")
                page.screenshot(path="verify_email_v8_notfound.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
