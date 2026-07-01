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

        print("\n--- Testing Global Economy Configuration Update ---")
        page.goto("https://www.pulseearn.online/admin/economy")
        page.wait_for_timeout(5000)

        config_btn = page.get_by_role("button", name="Update Config")
        if config_btn.is_visible():
            print("Clicking Update Config...")
            config_btn.click()
            page.wait_for_timeout(2000)

            # Click Commit Global State without changes
            commit_btn = page.get_by_role("button", name="Commit Global State")
            if commit_btn.is_visible():
                print("Clicking Commit...")
                commit_btn.click()
                page.wait_for_timeout(5000)

                content = page.content()
                if "Updated" in content:
                    print("SUCCESS: Config updated.")
                else:
                    print("INFO: Config update response unclear.")
            else:
                print("Commit button not found.")
        else:
            print("Update Config button not found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
