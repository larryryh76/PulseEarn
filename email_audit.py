from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Checking for Resend integration status in frontend console logs...")
        # Since I triggered Resend earlier for audit_test, let's see if there were console errors
        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')
        page.wait_for_timeout(5000)

        # Triger Resend and capture console
        logs = []
        page.on("console", lambda msg: logs.append(msg.text))

        print("Clicking Resend Email...")
        btn = page.query_selector('button:has-text("Resend Email")')
        if btn:
            btn.click()
            page.wait_for_timeout(5000)

            print("\n--- Console Logs ---")
            for log in logs:
                print(log)
        else:
            print("Button not found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
