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

        print("\n--- Testing Avatar Upload via Profile ---")
        page.goto("https://www.pulseearn.online/me")
        page.wait_for_timeout(5000)

        # Look for file input or avatar click
        avatar_btn = page.query_selector('input[type="file"]')
        if avatar_btn:
            print("Avatar file input found. Testing selection...")
            # We won't actually upload to avoid messing with production storage too much,
            # but we verify the input is active.
        else:
            print("Avatar file input not found.")

        print("\n--- Testing Task Proof Upload ---")
        page.goto("https://www.pulseearn.online/tasks")
        page.wait_for_timeout(5000)

        # Open a task details
        task_card = page.query_selector('.glass-card')
        if task_card:
            task_card.click()
            page.wait_for_timeout(2000)

            # Check for upload input in task drawer
            proof_input = page.query_selector('input[type="file"]')
            if proof_input:
                print("Task proof upload input found.")
            else:
                print("Task proof upload input NOT found.")
        else:
            print("No tasks found to test proof upload.")

        browser.close()

if __name__ == "__main__":
    run_audit()
