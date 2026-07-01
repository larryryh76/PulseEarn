from playwright.sync_api import sync_playwright

def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Probing https://www.pulseearn.online/assets/ (expect 404 or index)...")
        res = page.goto("https://www.pulseearn.online/assets/")
        print(f"Status: {res.status}")

        browser.close()

if __name__ == "__main__":
    run_probe()
