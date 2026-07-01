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

        print("\n--- Testing Prediction Resolution (v3) ---")
        page.goto("https://www.pulseearn.online/admin/predictions")
        page.wait_for_timeout(5000)

        # Resolve a prediction if possible
        resolve_btn = page.get_by_role("button", name="Resolve Forecast") # Example label
        if not resolve_btn.is_visible():
            # Try clicking a row first to open details
            row = page.query_selector('tr:nth-child(1)')
            if row:
                row.click()
                page.wait_for_timeout(2000)
                resolve_btn = page.query_selector('button:has-text("Resolve"), button:has-text("Settle")')

        if resolve_btn and resolve_btn.is_visible():
            print(f"Clicking Resolve button: {resolve_btn.inner_text()}")
            resolve_btn.click()
            page.wait_for_timeout(5000)
            page.screenshot(path="prediction_resolve_result.png")
        else:
            print("No Resolve button found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
