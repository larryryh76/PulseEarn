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

        print("\n--- Testing Prediction Management ---")
        page.goto("https://www.pulseearn.online/admin/predictions")
        page.wait_for_timeout(3000)

        # Check for predictions
        if "No Records Found" in page.content():
            print("No active predictions found.")
        else:
            print("Predictions found.")

        print("\n--- Testing Campaign Management ---")
        page.goto("https://www.pulseearn.online/admin/campaigns")
        page.wait_for_timeout(3000)

        # Check if New Campaign works
        create_btn = page.get_by_role("button", name="New Campaign")
        if create_btn.is_visible():
            print("New Campaign button found.")
        else:
             # Try other labels if any
             print("New Campaign button not found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
