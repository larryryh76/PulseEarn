from playwright.sync_api import sync_playwright

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://www.pulseearn.online/login")
        page.fill('input[type="email"]', 'admin@pulse.com')
        page.fill('input[type="password"]', 'dereal01')
        page.click('button[type="submit"]')
        page.wait_for_url("**/admin/**", timeout=15000)

        logs = []
        page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))

        print("\n--- Verifying Ledger Synchronization ---")
        page.goto("https://www.pulseearn.online/admin/ledger")
        page.wait_for_timeout(5000)

        page.screenshot(path="ledger_production.png")
        if "No Records Found" in page.content():
            print("Ledger is empty - CRITICAL economy failure or no transactions yet.")
        else:
            print("Ledger populated.")

        print("\n--- API Console Logs ---")
        for log in logs:
            if "api" in log.lower() or "error" in log.lower() or "json" in log.lower():
                print(log)

        browser.close()

if __name__ == "__main__":
    run_audit()
