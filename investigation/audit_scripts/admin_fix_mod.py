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

        print("Opening audit_test in Users module...")
        page.goto("https://www.pulseearn.online/admin/users")
        page.wait_for_timeout(5000)

        search = page.get_by_placeholder("Scan directory by Email, Username...")
        search.fill("audit_test@pulseearn.online")
        page.wait_for_timeout(3000)

        user_row = page.get_by_text("audit_test@pulseearn.online")
        if user_row.is_visible():
            user_row.click()
            page.wait_for_timeout(3000)

            # Check if emailVerified is actually set to True in the UI after previous save
            edit_btn = page.get_by_role("button", name="Edit Identity")
            edit_btn.click()
            page.wait_for_timeout(2000)

            # Use javascript to check the checked property
            is_checked = page.evaluate('document.querySelector("input[type=checkbox]").checked')
            print(f"Checkbox emailVerified: {is_checked}")

            if not is_checked:
                print("Re-setting emailVerified...")
                page.click('span:has-text("Mark Verified")')
                page.wait_for_timeout(1000)
                page.click('button:has-text("Save Changes")')
                page.wait_for_timeout(5000)
                print("Changes re-saved.")
            else:
                print("UI confirms emailVerified is TRUE.")
        else:
            print("User not found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
