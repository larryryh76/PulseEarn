from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Attempting login as Verified Moderator (audit_test@pulseearn.online)...")
        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')

        try:
            page.wait_for_url("**/admin/**", timeout=15000)
            print(f"Logged in. URL: {page.url}")
        except:
            print(f"Failed to reach admin. URL: {page.url}")
            page.screenshot(path="mod_login_fail_v3.png")

            # If still on verify-email, click "I have verified my email"
            if "/verify-email" in page.url:
                 print("Still on verify-email. Clicking manual check...")
                 page.click('button:has-text("I have verified my email")')
                 page.wait_for_timeout(5000)
                 print(f"URL after manual check: {page.url}")

            browser.close()
            return

        print("\n--- Verifying Moderator Nav Restrictions ---")
        nav_text = page.content()
        restricted = ["Withdrawals", "Transactions", "Economy Hub", "XP Engine", "Audit Logs", "System Health"]
        for item in restricted:
            if item in nav_text:
                print(f"CRITICAL: Moderator can see '{item}' in sidebar!")
            else:
                print(f"SUCCESS: '{item}' restricted from sidebar.")

        browser.close()

if __name__ == "__main__":
    run_audit()
