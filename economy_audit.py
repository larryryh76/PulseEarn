from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Probing /api/execute-transaction (GET)...")
        # I'll try to trigger the 500 error and see the raw response
        res = page.goto("https://www.pulseearn.online/api/execute-transaction")
        print(f"Status: {res.status}")
        text = res.text()
        print(f"Body snippet: {text[:200]}")

        if "A server error has occurred" in text:
            print("Confirmed: Vercel Function Invocation Failure.")
        elif "INTERNAL_SERVER_ERROR" in text:
            print("Confirmed: Flask level error (standardized).")
        else:
            print("Unexpected response format.")

        browser.close()

if __name__ == "__main__":
    run_audit()
