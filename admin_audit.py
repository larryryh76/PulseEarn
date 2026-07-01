from playwright.sync_api import sync_playwright
import time

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Login...")
        page.goto("https://www.pulseearn.online/login")
        page.wait_for_timeout(2000)

        print("Attempting Login as Admin...")
        page.fill('input[type="email"]', 'admin@pulse.com')
        page.fill('input[type="password"]', 'dereal01.')
        page.click('button[type="submit"]')

        page.wait_for_timeout(5000) # Wait for login and redirect

        print(f"Current URL: {page.url}")
        page.screenshot(path="admin_after_login.png")

        if "/admin" not in page.url and "/dashboard" not in page.url:
            print("Login failed or redirected elsewhere.")
            # Try navigating to admin manually if we are on dashboard
            if "/dashboard" in page.url:
                print("On dashboard, navigating to /admin...")
                page.goto("https://www.pulseearn.online/admin")
                page.wait_for_timeout(3000)
                print(f"URL after manual /admin: {page.url}")
                page.screenshot(path="admin_manual_nav.png")

        # Probing Admin Modules
        modules = ["overview", "users", "tasks", "campaigns", "predictions", "economy", "withdrawals", "support", "fraud", "health", "audit"]
        for mod in modules:
            print(f"Probing Admin Module: {mod}...")
            page.goto(f"https://www.pulseearn.online/admin/{mod}")
            page.wait_for_timeout(2000)
            page.screenshot(path=f"admin_mod_{mod}.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
