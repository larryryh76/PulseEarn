import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async_playwright_ctx = await async_playwright().start()
    browser = await async_playwright_ctx.chromium.launch()
    page = await browser.new_page(viewport={'width': 1280, 'height': 800})

    # Start the app in background
    # (Assuming it is already running or we start it here)
    # Since I'm in a sandbox, I'll assume the user wants me to verify the dev server

    print("Connecting to app...")
    try:
        await page.goto("http://localhost:5173", timeout=60000)
    except Exception as e:
        print(f"Could not connect: {e}")
        await browser.close()
        await async_playwright_ctx.stop()
        return

    # 1. Landing Page
    await page.screenshot(path="landing_page.png")
    print("Captured landing page")

    # 2. Signup
    await page.click("text=Get Started")
    await page.wait_for_selector("input[type='email']")
    await page.fill("input[type='email']", "admin@pulseearn.com")
    await page.fill("input[type='password']", "password123")
    await page.click("button[type='submit']")

    # Wait for dashboard
    await page.wait_for_selector("text=Total Balance", timeout=30000)
    await page.screenshot(path="dashboard_signed_in.png")
    print("Captured dashboard")

    # 3. Notifications
    await page.click("button:has(svg)") # Bell icon
    await asyncio.sleep(1)
    await page.screenshot(path="notifications_panel.png")
    print("Captured notifications")

    # 4. Predict Page
    await page.click("text=Predict")
    await page.wait_for_selector("text=Price Prediction")
    await page.screenshot(path="predict_game.png")
    print("Captured predict page")

    # 5. Admin Panel (Pulse Core)
    await page.goto("http://localhost:5173/pulse-core")
    await page.wait_for_selector("text=Control Center")
    await page.screenshot(path="admin_control_center.png")
    print("Captured admin panel")

    await browser.close()
    await async_playwright_ctx.stop()

if __name__ == "__main__":
    asyncio.run(run())
