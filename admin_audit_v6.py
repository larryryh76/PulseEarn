from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to Password Reset...")
        page.goto("https://www.pulseearn.online/login")
        page.wait_for_timeout(2000)

        reset_link = page.query_selector('text=Forgot Password?')
        if reset_link:
            reset_link.click()
            page.wait_for_timeout(2000)
            print("Filling reset email...")
            page.fill('input[type="email"]', 'admin@pulse.com')
            page.click('button:has-text("Reset")')
            page.wait_for_timeout(5000)
            print("Reset request submitted.")
            page.screenshot(path="password_reset_submitted.png")
        else:
            print("Forgot Password link not found.")
            page.screenshot(path="forgot_pass_not_found.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
