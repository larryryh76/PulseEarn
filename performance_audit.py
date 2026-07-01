from playwright.sync_api import sync_playwright
import time

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        start_time = time.time()
        print("Measuring page load time for landing...")
        page.goto("https://www.pulseearn.online")
        load_time = time.time() - start_time
        print(f"Landing Page Load: {load_time:.2f}s")

        print("Checking mobile responsiveness (iPhone 12)...")
        mobile_context = browser.new_context(viewport={'width': 390, 'height': 844})
        mobile_page = mobile_context.new_page()
        mobile_page.goto("https://www.pulseearn.online")
        mobile_page.screenshot(path="mobile_landing.png")

        mobile_page.goto("https://www.pulseearn.online/login")
        mobile_page.wait_for_timeout(2000)
        mobile_page.screenshot(path="mobile_login.png")

        browser.close()

if __name__ == "__main__":
    run_audit()
