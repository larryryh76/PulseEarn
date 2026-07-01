from playwright.sync_api import sync_playwright

def run_check():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://www.pulseearn.online/signup")
        page.wait_for_timeout(2000)

        print("Checking if admin@pulse.com exists by attempting signup...")
        page.fill('input[name="username"]', 'TemporaryAdmin')
        page.fill('input[name="email"]', 'admin@pulse.com')
        page.fill('input[name="password"]', 'TemporaryPass123!')
        page.fill('input[name="confirmPassword"]', 'TemporaryPass123!')
        page.click('button[type="submit"]')

        page.wait_for_timeout(5000)

        # Check for "Email already in use" toast or message
        html = page.content()
        if "already in use" in html or "already exists" in html:
            print("RESULT: admin@pulse.com exists.")
        else:
            print("RESULT: admin@pulse.com does not seem to exist or signup failed for another reason.")
            page.screenshot(path="signup_admin_attempt.png")

        browser.close()

if __name__ == "__main__":
    run_check()
