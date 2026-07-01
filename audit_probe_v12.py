from playwright.sync_api import sync_playwright

def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Probing https://www.pulseearn.online/api/tasks/submit (POST with User-Agent)...")
        api_request_context = p.request.new_context(base_url="https://www.pulseearn.online", user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        res = api_request_context.post("/api/tasks/submit")
        print(f"Status: {res.status}")
        print(f"Body: {res.text()[:200]}")

        browser.close()

if __name__ == "__main__":
    run_probe()
