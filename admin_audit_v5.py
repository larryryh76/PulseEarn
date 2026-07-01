from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to verify-email...")
        page.goto("https://www.pulseearn.online/verify-email")
        page.wait_for_timeout(3000)

        # Look for "Resend" button to check if it's there
        resend_btn = page.query_selector('button:has-text("Resend")')
        if resend_btn:
            print("Found Resend button.")
            page.screenshot(path="verify_email_page.png")
        else:
            print("Resend button not found.")
            page.screenshot(path="verify_email_page_error.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
