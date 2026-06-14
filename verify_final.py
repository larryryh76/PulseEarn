from playwright.sync_api import sync_playwright
import os

def run_verification(page):
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    # 1. Check Overview
    print("Checking Overview...")
    page.goto("http://localhost:5173/admin/overview")
    page.wait_for_timeout(5000)
    page.screenshot(path="verification/screenshots/overview_final.png")

    # 2. Check Economy
    print("Checking Economy Hub...")
    page.goto("http://localhost:5173/admin/economy")
    page.wait_for_timeout(5000)
    page.screenshot(path="verification/screenshots/economy_final.png")

    # 3. Check Users
    print("Checking User Directory...")
    page.goto("http://localhost:5173/admin/users")
    page.wait_for_timeout(5000)
    page.screenshot(path="verification/screenshots/users_final.png")

    # 4. Check Tasks
    print("Checking Task Library...")
    page.goto("http://localhost:5173/admin/tasks")
    page.wait_for_timeout(5000)
    page.screenshot(path="verification/screenshots/tasks_final.png")

    # 5. Check Dashboard (User Side)
    print("Checking User Dashboard...")
    page.goto("http://localhost:5173/dashboard")
    page.wait_for_timeout(5000)
    page.screenshot(path="verification/screenshots/dashboard_final.png")

if __name__ == "__main__":
    os.makedirs("verification/screenshots", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
        finally:
            browser.close()
