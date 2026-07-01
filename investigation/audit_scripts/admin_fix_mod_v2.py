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

            # Use 'Promote' if available
            promote_btn = page.query_selector('button:has-text("Promote")')
            if promote_btn:
                print("Promoting again just in case...")
                page.on("dialog", lambda dialog: dialog.accept())
                promote_btn.click()
                page.wait_for_timeout(3000)

            # Edit Identity
            edit_btn = page.get_by_role("button", name="Edit Identity")
            edit_btn.click()
            page.wait_for_timeout(2000)

            print("Checking if Mark Verified click works...")
            # Let's try to click the input directly using coordinates or a better selector
            checkbox = page.query_selector('input[type="checkbox"]')
            if checkbox:
                 checkbox.click() # Toggle it
                 page.wait_for_timeout(1000)
                 is_checked = page.evaluate('document.querySelector("input[type=checkbox]").checked')
                 print(f"Checkbox after toggle: {is_checked}")

                 # Save
                 page.click('button:has-text("Save Changes")')
                 page.wait_for_timeout(5000)
                 print("Saved.")
            else:
                 print("Checkbox not found.")
        else:
            print("User not found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
