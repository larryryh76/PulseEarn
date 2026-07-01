from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'admin@pulse.com')
        page.fill('input[type="password"]', 'dereal01')
        page.click('button[type="submit"]')
        page.wait_for_url("**/admin/**", timeout=15000)

        print("Navigating to Dashboard as Admin...")
        page.goto("https://www.pulseearn.online/dashboard")
        page.wait_for_timeout(5000)
        print(f"URL: {page.url}")

        if "/dashboard" in page.url:
            print("Admin can access dashboard. Testing Daily Reward button...")
            # Look for Daily Reward button
            btn = page.query_selector('button:has-text("Claim"), button:has-text("PTS")')
            if btn:
                print(f"Found button: {btn.inner_text()}")
                btn.click()
                page.wait_for_timeout(3000)
                page.screenshot(path="daily_reward_click.png")
            else:
                print("Daily Reward button not found.")
        else:
            print("Admin blocked from dashboard.")

        browser.close()

if __name__ == "__main__":
    run_audit()
