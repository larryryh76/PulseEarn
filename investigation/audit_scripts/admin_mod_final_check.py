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

        page.goto("https://www.pulseearn.online/admin/users")
        page.wait_for_timeout(5000)

        search = page.get_by_placeholder("Scan directory by Email, Username...")
        search.fill("audit_test@pulseearn.online")
        page.wait_for_timeout(3000)

        user_row = page.get_by_text("audit_test@pulseearn.online")
        user_row.click()
        page.wait_for_timeout(3000)

        print("Checking if 'Promote' button is still there...")
        promote_btn = page.query_selector('button:has-text("Promote")')
        if promote_btn:
            print("Promote button IS present. audit_test is NOT currently recognized as mod/admin.")
        else:
            print("Promote button NOT present. audit_test IS recognized as mod/admin.")

        print("Checking role label in UI...")
        role_label = page.query_selector('.bg-primary\/10 .text-primary')
        if role_label:
            print(f"Role label says: {role_label.inner_text()}")

        browser.close()

if __name__ == "__main__":
    run_audit()
