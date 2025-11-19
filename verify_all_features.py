from playwright.sync_api import Page, expect, sync_playwright

def verify_all_features(page: Page):
    """
    This script verifies the main features implemented.
    """
    # 1. Verify homepage featured project
    print("Verifying homepage...")
    page.goto("http://localhost:3000/public/page_accueil.html")
    expect(page.locator(".main-project-card h2")).to_have_text("Projet Robotique", timeout=10000)
    page.screenshot(path="/home/jules/01_homepage.png")

    # 2. Verify drafts page
    print("Verifying drafts page...")
    page.goto("http://localhost:3000/intranet/brouillons.html")
    expect(page.locator("text=Projet Hydrogène")).to_be_visible(timeout=10000)
    expect(page.locator('tr:has-text("Projet Hydrogène") a.button:has-text("Modifier")')).to_be_visible()
    page.screenshot(path="/home/jules/02_brouillons.png")

    # 3. Verify editor and media gallery
    print("Verifying editor and media gallery...")
    # Use the correct, sanitized filename
    with page.expect_response("**/api/project?file=projet_hydrog_ne.md&type=draft") as response_info:
        page.goto("http://localhost:3000/intranet/editor.html?file=projet_hydrog_ne.md")

    expect(page.locator("#visual-editor-container h1")).to_have_text("Projet Hydrogène")
    expect(page.locator("h2:has-text('Multimédias')")).to_be_visible()
    expect(page.locator("button.add-media-button")).to_be_visible()
    page.screenshot(path="/home/jules/03_editor_gallery.png")

    print("Verification complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_all_features(page)
        finally:
            browser.close()
