from playwright.sync_api import sync_playwright
import os

def run_cuj(page):
    page.goto("http://localhost:5181")
    page.wait_for_timeout(2000)
    page.screenshot(path="v_landing_final.png")

    page.goto("http://localhost:5181/predict")
    page.wait_for_timeout(4000)
    page.screenshot(path="v_predict_final.png")

    page.goto("http://localhost:5181/withdraw")
    page.wait_for_timeout(4000)
    page.screenshot(path="v_withdraw_final.png")

    page.goto("http://localhost:5181/pulse-core/ai")
    page.wait_for_timeout(4000)
    page.screenshot(path="v_admin_ai_final.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
