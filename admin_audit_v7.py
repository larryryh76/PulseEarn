from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to verify-email for audit_test...")
        # Since I can't easily login without password, but I am already logged in after signup?
        # Let's try navigating to dashboard for audit_test (I just signed up in v4)
        page.goto("https://www.pulseearn.online/login")
        page.fill('input[name="email"]', 'audit_test@pulseearn.online')
        page.fill('input[name="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')
        page.wait_for_timeout(5000)

        print(f"URL: {page.url}")

        if "/verify-email" in page.url:
            print("On verify-email page. Attempting to click Resend.")
            # VerifyEmail.tsx has "Resend Email" button
            resend_btn = page.query_selector('button:has-text("Resend Email")')
            if resend_btn:
                resend_btn.click()
                print("Clicked Resend Email.")
                page.wait_for_timeout(5000)
                page.screenshot(path="verify_email_clicked.png")
            else:
                print("Resend Email button not found.")
                # Print all buttons
                btns = page.query_selector_all('button')
                for b in btns:
                    print(f"Button: {b.inner_text()}")

        browser.close()

if __name__ == "__main__":
    run_audit()
