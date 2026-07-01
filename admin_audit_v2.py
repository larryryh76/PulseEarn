from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        page.goto("https://www.pulseearn.online/login")
        page.wait_for_timeout(1000)

        print("Filling credentials...")
        page.fill('input[type="email"]', 'admin@pulse.com')
        page.fill('input[type="password"]', 'dereal01.')
        page.screenshot(path="login_step1.png")

        print("Clicking login...")
        page.click('button[type="submit"]')

        # Wait for potential errors or redirects
        page.wait_for_timeout(10000)

        print("\n--- Console Logs during Login ---")
        for log in console_logs:
            print(log)

        print(f"\nFinal URL: {page.url}")
        page.screenshot(path="login_final_state.png")

        # Try to find error messages on page
        error_msg = page.query_selector('.text-red-500') # Generic Tailwind error class
        if error_msg:
            print(f"Error on page: {error_msg.inner_text()}")

        browser.close()

if __name__ == "__main__":
    run_audit()
