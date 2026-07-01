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

        print("\n--- Testing Manual Economy Adjustment (Audit Test) ---")
        page.goto("https://www.pulseearn.online/admin/users")
        page.wait_for_timeout(5000)

        search = page.get_by_placeholder("Scan directory by Email, Username...")
        search.fill("audit_test@pulseearn.online")
        page.wait_for_timeout(3000)

        user_row = page.get_by_text("audit_test@pulseearn.online")
        user_row.click()
        page.wait_for_timeout(3000)

        # Look for the "+" button next to Liquid Balance
        plus_btn = page.query_selector('button:has-text("+")') # This is broad, might need better selector
        if plus_btn:
            print("Found point adjustment (+) button. Clicking...")
            # Capture dialog
            page.on("dialog", lambda dialog: dialog.accept())

            plus_btn.click()
            page.wait_for_timeout(5000)
            print("Adjustment triggered.")

            # Check for success toast
            content = page.content()
            if "Ledger Updated" in content:
                print("SUCCESS: Adjustment completed successfully.")
            elif "A server error" in content:
                print("FAILED: API error (Unexpected token A).")
            else:
                print("INFO: No immediate confirmation found in content.")
        else:
            print("Plus button NOT found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
