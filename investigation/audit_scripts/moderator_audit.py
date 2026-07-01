from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Attempting login as newly promoted Moderator (audit_test@pulseearn.online)...")
        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'audit_test@pulseearn.online')
        page.fill('input[type="password"]', 'AuditPass123!')
        page.click('button[type="submit"]')

        # Moderator should be redirected to admin
        try:
            page.wait_for_url("**/admin/**", timeout=10000)
            print(f"Logged in. URL: {page.url}")
        except:
            print(f"Failed to reach admin. URL: {page.url}")
            page.screenshot(path="mod_login_fail.png")
            browser.close()
            return

        print("\n--- Verifying Moderator Nav Restrictions ---")
        nav_text = page.content()
        restricted = ["Economy Hub", "Withdrawals", "Transactions", "XP Engine", "Audit Logs", "System Health"]
        for item in restricted:
            if item in nav_text:
                print(f"CRITICAL: Moderator can see '{item}' in sidebar!")
            else:
                print(f"SUCCESS: '{item}' restricted from sidebar.")

        print("\n--- Testing Direct URL Access to Restricted Modules ---")
        paths = ["/admin/economy", "/admin/withdrawals", "/admin/health"]
        for path in paths:
             page.goto(f"https://www.pulseearn.online{path}")
             page.wait_for_timeout(3000)
             if "/admin/overview" in page.url or "Access Denied" in page.content() or "/dashboard" in page.url:
                 print(f"SUCCESS: Direct access to {path} blocked.")
             else:
                 print(f"CRITICAL: Direct access to {path} ALLOWED! URL: {page.url}")

        browser.close()

if __name__ == "__main__":
    run_audit()
