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

        print("\n--- Verifying audit_test@pulseearn.online in Users Module ---")
        page.goto("https://www.pulseearn.online/admin/users")
        page.wait_for_timeout(5000)

        search = page.get_by_placeholder("Scan directory by Email, Username...")
        search.fill("audit_test@pulseearn.online")
        page.wait_for_timeout(3000)

        user_row = page.get_by_text("audit_test@pulseearn.online")
        if user_row.is_visible():
            print("User row found. Opening details...")
            user_row.click()
            page.wait_for_timeout(3000)

            # Check Role in Modal
            content = page.content()
            if "MODERATOR" in content.upper():
                print("Confirmed: audit_test has MODERATOR role.")
            else:
                print("Role is NOT Moderator.")

            # Click Edit Identity to check/set emailVerified
            edit_btn = page.get_by_role("button", name="Edit Identity")
            if edit_btn.is_visible():
                edit_btn.click()
                page.wait_for_timeout(2000)

                # Check Mark Verified
                verified_check = page.query_selector('input[type="checkbox"]')
                if verified_check and not verified_check.is_checked():
                    print("Setting emailVerified to True...")
                    # Click the parent or label or the checkbox itself
                    page.click('span:has-text("Mark Verified")')
                    page.wait_for_timeout(1000)

                    # Click Save
                    save_btn = page.get_by_role("button", name="Save Changes")
                    save_btn.click()
                    page.wait_for_timeout(5000)
                    print("Changes saved.")
                else:
                    print("Already verified or checkbox not found.")
        else:
            print("User row NOT visible.")

        browser.close()

if __name__ == "__main__":
    run_audit()
