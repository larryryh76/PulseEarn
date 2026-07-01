from playwright.sync_api import sync_playwright
import json

def run_probe():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        print("Checking redirects...")
        response = page.goto("https://pulseearn.online")
        print(f"Final URL: {page.url}")
        print(f"Status: {response.status}")

        print("\nChecking /api/health or similar (probing common endpoints)...")
        # I'll try to hit an endpoint that might exist or just check a 404 response format
        api_test = page.goto("https://pulseearn.online/api/nonexistent")
        print(f"API 404 Status: {api_test.status}")
        try:
            print(f"API 404 Body: {api_test.text()[:100]}")
        except:
            print("Could not read body")

        # Check for Vercel/Flask error signature
        api_reward_test = page.goto("https://pulseearn.online/api/execute-transaction") # Should be 405 or 401
        print(f"API Reward Test Status: {api_reward_test.status}")
        try:
            text = api_reward_test.text()
            print(f"API Reward Test Body (first 100 chars): {text[:100]}")
            if text.startswith("<!DOCTYPE html>") or text.startswith("A server error"):
                print("DETECTED: API returning HTML/Text instead of JSON")
        except:
            print("Could not read body")

        browser.close()

if __name__ == "__main__":
    run_probe()
