from playwright.sync_api import sync_playwright

def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Probing https://pulseearn.online/api/tasks/submit (No WWW)...")
        res = page.goto("https://pulseearn.online/api/tasks/submit")
        print(f"Status: {res.status}")
        print(f"Body: {res.text()[:200]}")

        browser.close()

if __name__ == "__main__":
    run_probe()
