import asyncio
from playwright.async_api import async_playwright

async def run():
    async_playwright_ctx = await async_playwright().start()
    browser = await async_playwright_ctx.chromium.launch()
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})

    print("Connecting to app...")
    await page.goto("http://localhost:5173", timeout=60000)
    await asyncio.sleep(2)

    # Signup
    await page.click("text=Get Started")
    await asyncio.sleep(1)

    await page.fill("input[placeholder='Choose a username']", "jules_test")
    await page.fill("input[type='email']", "jules@test.com")
    await page.fill("input[type='password']", "password123")
    await page.click("button:has-text('Sign Up')")

    # Wait for dashboard
    try:
        await page.wait_for_selector("text=Total Balance", timeout=15000)
        print("At Dashboard")
        await asyncio.sleep(2)
        await page.screenshot(path="v_dashboard_final.png")

        # Click Bell icon
        await page.click("button:has(svg)")
        await asyncio.sleep(1)
        await page.screenshot(path="v_notifications_final.png")

        # Go to Predict
        await page.click("text=Predict")
        await page.wait_for_selector("text=Price Prediction")
        await asyncio.sleep(1)
        await page.screenshot(path="v_predict_final.png")

        # Go to Pulse Core (Admin)
        await page.goto("http://localhost:5173/pulse-core")
        await page.wait_for_selector("text=Control Center")
        await asyncio.sleep(1)
        await page.screenshot(path="v_admin_final.png")

    except Exception as e:
        print(f"Flow failed: {e}")
        await page.screenshot(path="v_flow_error.png")

    await browser.close()
    await async_playwright_ctx.stop()

if __name__ == "__main__":
    asyncio.run(run())
