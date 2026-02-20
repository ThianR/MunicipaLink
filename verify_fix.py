from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("http://localhost:3000/")

        # Wait for modules to load (admin.js is loaded via admin-view-connector or main.js)
        # We need to wait a bit because it's a module script.
        page.wait_for_timeout(2000)

        # Check if window.gestionarSolicitudRol is undefined
        is_defined = page.evaluate("typeof window.gestionarSolicitudRol !== 'undefined'")
        print(f"window.gestionarSolicitudRol is defined: {is_defined}")

        if not is_defined:
            print("SUCCESS: window.gestionarSolicitudRol is NOT defined.")
        else:
            print("FAILURE: window.gestionarSolicitudRol IS defined.")

        page.screenshot(path="verification.png")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
