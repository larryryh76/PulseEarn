from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Checking if /api/execute-transaction (POST) returns HTML...")
        api_request_context = p.request.new_context(base_url="https://www.pulseearn.online")
        res = api_request_context.post("/api/execute-transaction")
        print(f"Status: {res.status}")
        text = res.text()
        print(f"Body snippet: {text[:200]}")

        if text.strip().startswith("<!doctype html>"):
             print("DETECTED: POST request returning HTML instead of JSON!")

        browser.close()

if __name__ == "__main__":
    run_audit()
