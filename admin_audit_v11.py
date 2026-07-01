from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Testing Google Sign-in popup (checking for COOP/COEP issues)...")
        page.goto("https://www.pulseearn.online/login")
        page.wait_for_timeout(2000)

        # Check for Google button
        google_btn = page.query_selector('button:has-text("Continue with Google")')
        if google_btn:
            print("Found Google button. Attempting click (popup)...")
            # We can't easily automate the popup, but we can see if it opens or errors out in console
            google_btn.click()
            page.wait_for_timeout(5000)
            page.screenshot(path="google_login_attempt.png")
        else:
            print("Google button not found.")

        browser.close()

if __name__ == "__main__":
    run_audit()
