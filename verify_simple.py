import asyncio
from playwright.async_api import async_playwright

async def run():
    async_playwright_ctx = await async_playwright().start()
    browser = await async_playwright_ctx.chromium.launch()
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})

    print("Connecting to app...")
    await page.goto("http://localhost:5173", timeout=60000)
    await asyncio.sleep(2) # Wait for animations
    await page.screenshot(path="v_landing.png")

    # Click Get Started
    await page.click("text=Get Started")
    await asyncio.sleep(1)
    await page.screenshot(path="v_auth.png")

    # Fill login
    await page.fill("input[type='email']", "test@pulseearn.com")
    await page.fill("input[type='password']", "password123")
    await page.click("button[type='submit']")

    # Wait for navigation to dashboard
    try:
        await page.wait_for_url("**/dashboard", timeout=10000)
        await asyncio.sleep(2)
        await page.screenshot(path="v_dashboard.png")

        # Open Notifications
        await page.click("button:has(svg)")
        await asyncio.sleep(1)
        await page.screenshot(path="v_notifications.png")
    except Exception as e:
        print(f"Dashboard failed: {e}")
        await page.screenshot(path="v_error.png")

    await browser.close()
    await async_playwright_ctx.stop()

if __name__ == "__main__":
    asyncio.run(run())
