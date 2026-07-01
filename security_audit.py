from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Testing for Firestore permission leakage in console...")
        page.goto("https://www.pulseearn.online/login")
        page.wait_for_timeout(3000)

        # Check for [EconomyConfig] Permission Denied
        # I saw this earlier in my logs

        print("Auditing headers (COOP/COEP)...")
        res = page.goto("https://www.pulseearn.online")
        print(f"COOP: {res.headers.get('cross-origin-opener-policy')}")

        browser.close()

if __name__ == "__main__":
    run_audit()
