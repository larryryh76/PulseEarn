from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Navigating to dashboard...")
        # Since I can't be admin or verified, I'll try to at least see if landing page is okay
        page.goto("https://www.pulseearn.online/")
        page.wait_for_timeout(2000)

        # Click on something that doesn't require login
        print("Checking footer links...")
        footer_links = ["/privacy", "/terms", "/cookies", "/referral-policy"]
        for link in footer_links:
            print(f"Probing {link}...")
            page.goto(f"https://www.pulseearn.online{link}")
            page.wait_for_timeout(1000)
            print(f"Status for {link}: {page.url}")

        browser.close()

if __name__ == "__main__":
    run_audit()
