from playwright.sync_api import sync_playwright
import json

def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        failed_requests = []
        page.on("requestfailed", lambda request: failed_requests.append({
            "url": request.url,
            "error": request.failure.error_text if request.failure else "Unknown"
        }))

        responses = []
        def handle_response(response):
            if "/api/" in response.url:
                responses.append({
                    "url": response.url,
                    "status": response.status,
                    "headers": response.headers
                })
        page.on("response", handle_response)

        print("Navigating to https://pulseearn.online ...")
        page.goto("https://pulseearn.online")
        page.wait_for_timeout(5000) # Wait for initial load and some async stuff

        print("\n--- Console Errors ---")
        for err in console_errors:
            print(f"Error: {err}")

        print("\n--- Failed Requests ---")
        for req in failed_requests:
            print(f"Failed: {req['url']} - {req['error']}")

        print("\n--- API Responses ---")
        for res in responses:
            print(f"API {res['status']}: {res['url']}")

        page.screenshot(path="audit_live_landing.png")
        browser.close()

if __name__ == "__main__":
    run_probe()
