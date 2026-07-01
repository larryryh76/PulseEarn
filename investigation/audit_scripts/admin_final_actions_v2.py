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

        print("\n--- Verifying Predictions Action (Resolve) ---")
        page.goto("https://www.pulseearn.online/admin/predictions")
        page.wait_for_timeout(3000)

        # Click on a prediction if any
        pred_row = page.query_selector('tr:has-text("BTC"), tr:has-text("ETH")')
        if pred_row:
             print("Found prediction row, clicking...")
             pred_row.click()
             page.wait_for_timeout(2000)
             page.screenshot(path="prediction_details.png")
        else:
             print("No BTC/ETH prediction found in list.")

        print("\n--- Verifying Validation Action ---")
        page.goto("https://www.pulseearn.online/admin/validation")
        page.wait_for_timeout(3000)

        if "No Records Found" in page.content():
            print("No pending validations.")
        else:
            print("Validations found.")
            page.screenshot(path="validation_queue.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
