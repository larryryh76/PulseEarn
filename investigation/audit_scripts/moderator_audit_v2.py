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
            page.screenshot(path="mod_login_fail_v2.png")
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

        print("\n--- Testing Direct URL Access to Restricted Modules ---")
        paths = ["/admin/economy", "/admin/withdrawals", "/admin/health"]
        for path in paths:
             print(f"Trying to access {path}...")
             page.goto(f"https://www.pulseearn.online{path}")
             page.wait_for_timeout(3000)
             # OpsLayoutContent returns an "Access Denied" view if not admin/mod,
             # but here we ARE a mod. The item.isAdminOnly in OpsLayout should block the view content?
             # Let's check page content.
             content = page.content()
             if "Access Denied" in content or "not authorized" in content:
                 print(f"SUCCESS: Direct access to {path} blocked (Access Denied view).")
             elif path.split("/")[-1].upper() in content.upper() and ("Economy" in content or "Withdrawal" in content):
                  print(f"CRITICAL: Direct access to {path} ALLOWED! Page content suggests module rendered.")
             else:
                 print(f"INFO: Access to {path} behavior: {page.url}")

        browser.close()

if __name__ == "__main__":
    run_audit()
