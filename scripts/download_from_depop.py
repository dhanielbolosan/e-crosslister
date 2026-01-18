import asyncio
import json
import os
import sys
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from urllib.parse import urljoin

TIMEOUT_LONG = 60000
TIMEOUT_SHORT = 10000
TIMEOUT_SCROLL = 3000
CONCURRENCY = 5

async def get_listing_urls(page, base_url):
    print("Loading depop products...", end="\r", flush=True)

    # Wait for products to load, return empty if none found
    try:
        await page.wait_for_selector('li[class*="listItem"]', timeout=TIMEOUT_SHORT)
    except:
        print("Warning: No products found on profile.")
        return []

    # Scroll down to load paginated products if any
    prev_active_count = 0
    attempts = 0
    
    while True:
        scrolled = await page.evaluate("""() => {
            const items = Array.from(document.querySelectorAll('li[class*="listItem"]'));
            const activeItems = items.filter(item => !item.querySelector('[class*="soldText"]'));
            
            if (activeItems.length > 0) {
                const lastActive = activeItems[activeItems.length - 1];
                lastActive.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return true;
            }
            return false;
        }""")

        if not scrolled:
            # If no active items found, fallback to scrolling to bottom
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        
        await page.wait_for_timeout(TIMEOUT_SCROLL)

        # Count currently visible ACTIVE items
        curr_active_count = await page.evaluate("""() => {
            const items = Array.from(document.querySelectorAll('li[class*="listItem"]'));
            return items.filter(item => !item.querySelector('[class*="soldText"]')).length;
        }""")

        if curr_active_count == prev_active_count:
            attempts += 1
        else:
            attempts = 0
            print(f"Total listings found: {curr_active_count}", end="\r", flush=True)
        
        if attempts >= 5:
            break

        prev_active_count = curr_active_count
    
    # Extract links after full load
    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    products = []
    seen = set()

    for product in soup.select('li[class*="listItem"]'):
        if product.select_one('[class*="soldText"]'):
            continue

        url_tag = product.select_one('a[href*="/products/"]')

        if url_tag:
            href = url_tag.get('href')
            full_url = urljoin(base_url, href)

            if full_url not in seen:
                seen.add(full_url)
                products.append(full_url)
    
    print(f"Total ACTIVE listings found: {len(products)}")
    
    return products

async def get_listing_details(context, product_url, semaphore, progress, total):
    async with semaphore:
        page = await context.new_page()

        try: 
            # Wait for page to load and verify product exists
            response = await page.goto(product_url, wait_until="domcontentloaded", timeout=TIMEOUT_LONG)

            if response.status == 404 or await page.locator("text=Page not found").is_visible():
                print(f"Error: '{product_url}' is not a valid Depop product!")
                return None
            
            try:
                await page.wait_for_selector('div[data-testid="productPrimaryAttributes"]', timeout=TIMEOUT_SHORT//2)
            except:
                pass

            # Extract product details
            html = await page.content()
            await page.close()
            soup = BeautifulSoup(html, "html.parser")

            title_tag = soup.select_one('h1[class*="styles_title"]')
            title = title_tag.get_text(strip=True) if title_tag else ""

            price_tag = soup.select_one('p[aria-label="Price"]')
            price = price_tag.get_text(strip=True).replace("$", "") if price_tag else ""

            desc_tag = soup.select_one('p[class*="styles_textWrapper"]')
            description = desc_tag.get_text(strip=True) if desc_tag else ""

            attr_container = soup.select('div[data-testid="productPrimaryAttributes"] p')
            attributes = [attr.get_text(strip=True) for attr in attr_container]
    
            size = attributes[0].replace("Size", "").strip() if len(attributes) > 0 else ""
            condition = attributes[1].replace("condition", "").strip() if len(attributes) > 1 else ""
    
            brand_tag = soup.select_one('div[data-testid="productPrimaryAttributes"] a')
            brand = brand_tag.get_text(strip=True) if brand_tag else ""

            images = []
            for img in soup.select('div[class*="styles_imageContainer"] img'):
                src = img.get('src')
                if src and "media-photos.depop.com" in src and src not in images:
                    images.append(src)

            progress[0] += 1
            print(f"[{progress[0]}/{total}] Processing {product_url}" + " " * 20, end="\r", flush=True)

            return {
                "url": product_url,
                "title": title,
                "price": price,
                "description": description,
                "size": size,
                "condition": condition,
                "brand": brand,
                "images": images
            }

        except Exception as e:
            print(f"Error: Failed to load product details for '{product_url}': {e}")
            return None

async def scrape_depop_profile(username:str):
    base_url = "https://www.depop.com"
    profile_url = f"{base_url}/{username}/"

    async with async_playwright() as playwright:
        # Avoid bot detection
        browser = await playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled", 
            ]
        )

        # Set viewport and user agent
        context = await browser.new_context(
            viewport={"width": 390, "height": 844},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
            locale="en-US",
            has_touch=True,
            is_mobile=True
        )
        
        print(f"Navigating to {profile_url}")
        page = await context.new_page()
        response = await page.goto(profile_url, wait_until="domcontentloaded", timeout=TIMEOUT_LONG)

        error_response = response.status == 404
        not_found = await page.locator("text=Page not found").is_visible()
        not_profile = not await page.locator('[class*="styles_shopHeader"]').is_visible()

        if error_response or not_found or not_profile:
            print(f"Error: '{username}' is not a valid Depop profile!")
            await page.close()
            return []

        product_urls = await get_listing_urls(page, base_url)
        await page.close()

        total_products = len(product_urls)

        semaphore = asyncio.Semaphore(CONCURRENCY)
        progress = [0]
        tasks = [
            get_listing_details(context, url, semaphore, progress, total_products) 
            for url in product_urls
        ]
        product_details = await asyncio.gather(*tasks)
        print("")

        all_product_details = [pd for pd in product_details if pd]
        
        await browser.close()
        await context.close()
    
    return all_product_details

def save_depop_products(username: str, products_list: list, out_dir: str = "data") -> str:
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"{username}_depop_listings.json")

    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(products_list, f, indent=4)
        print(f"Success: Saved product listings to {path}!")
        return path
    except Exception as e:
        print(f"Error: Failed to save product listings to JSON: {e}!")
        return ""

def main():
    username = input("Enter Depop username: ").strip()
    if not username:
        print("No username provided!")
        sys.exit(1)

    listings = asyncio.run(scrape_depop_profile(username))
    if listings:
        save_depop_products(username, listings)

if __name__ == "__main__":
    main()
