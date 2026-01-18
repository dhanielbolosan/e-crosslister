const data = {
    "url": "https://www.depop.com/products/dbruhhhh-givenchy-flex-bracelet-like-pear-cut-8d64/",
    "title": "",
    "price": "20.00",
    "description": "Givenchy flex bracelet style look alike Pear-Cut CZ Tennis Bracelet (\u203c\ufe0fSOLD AS 1 PRODUCT\u203c\ufe0f)\n\n*Length:** Approx. 7.5 inches\nBrand new dazzling bracelet, featuring a row of large pear cut cubic zirconia stones set in a high quality silver-tone setting. Each stone sparkles brilliantly in the light, making it a perfect accessory for weddings, formal events, or adding a touch of glam to your everyday look. Secure clasp for all-day wear.\nOther style on page\u203c\ufe0f\u203c\ufe0f#cubiczirconia#handmadejewelry#jewelrydesigner#luxury#givenchy",
    "size": "Like new condition",
    "condition": "",
    "brand": "",
    "images": [
        "https://media-photos.depop.com/b1/46077357/2676392842_dfa797e9585c44a5a3eb3f879c58dd04/P0.jpg",
        "https://media-photos.depop.com/b1/46077357/2676392843_e9ba225b4ac240c69a12ef5782f489c6/P0.jpg",
        "https://media-photos.depop.com/b1/46077357/2676392840_b06ac6db3b024181b7b91108c43c57fa/P0.jpg",
        "https://media-photos.depop.com/b1/46077357/2676392841_ace2611a452943719a4631691a45530a/P0.jpg"
    ]
}

const conditionMap = {
    "Brand new": "New with tags",
    "Like new": "New without tags",
    "Excellent": "Very good",
    "Good": "Good",
    "Fair": "Satisfactory"
}

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function waitForElement(selector, timeout = 10000) {
    const start = Date.now();
    while (!document.querySelector(selector)) {
        if (Date.now() - start > timeout) return null;
        await sleep(500);
    }
    return document.querySelector(selector);
}

function updateStatus(message) {
    let statusBox = document.getElementById("status-box");

    if (!statusBox) {
        statusBox = document.createElement("div");
        statusBox.id = "status-box";
        statusBox.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #222;
            color: white;
            padding: 15px 25px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            gap: 15px;
            min-width: 200px;
            z-index: 2147483647;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
        `;
        document.body.appendChild(statusBox);

        setTimeout(() => {
            statusBox.style.opacity = "1";
            statusBox.style.transform = "translateY(0)";
        }, 10);
    }

    statusBox.innerHTML = `
        <div style="font-size: 24px; animation: spin 2s linear infinite;">⚙️</div>
        <div>
            <div style="font-size: 14px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px;">Status</div>
            <div style="font-size: 16px; font-weight: 600;">${message}</div>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
    `;
}

function hideStatus() {
    const statusBox = document.getElementById("status-box");
    if (statusBox) {
        statusBox.style.opacity = "0";
        statusBox.style.transform = "translateY(20px)";
        setTimeout(() => statusBox.remove(), 300);
    }
}

function preventUserInteraction(e) {
    if (e.isTrusted) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        e.preventDefault();
        return false;
    }
}

function enableInputBlocking() {
    const events = ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress', 'contextmenu'];
    events.forEach(event => {
        window.addEventListener(event, preventUserInteraction, true);
    });
}

function disableInputBlocking() {
    const events = ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress', 'contextmenu'];
    events.forEach(event => {
        window.removeEventListener(event, preventUserInteraction, true);
    });
}

async function handleAuthenticityModal() {
    const closeButton = document.querySelector('[data-testid="authenticity-modal--close-button"]');

    if (closeButton) {
        closeButton.click();
        return true;
    }

    return false;
}

async function uploadImages(imageUrls) {
    updateStatus("Uploading Images");
    const fileInput = await waitForElement('input[name="photos"]');
    if (!fileInput) return;

    const dataTransfer = new DataTransfer();

    for (let i = 0; i < imageUrls.length; i++) {
        try {
            const response = await fetch(imageUrls[i]);
            const blob = await response.blob();
            const file = new File([blob], `photo_${i}.jpg`, { type: "image/jpeg" });
            dataTransfer.items.add(file);
        } catch (error) {
            console.error("Error downloading image:", imageUrls[i], error);
        }
    }

    fileInput.files = dataTransfer.files;
    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
}

async function fillDropdowns() {
    // Category
    updateStatus("Selecting Category");
    const categoryInput = await waitForElement('input[name="category"]');
    if (categoryInput) {
        categoryInput.click();
        const categorySuggestion = await waitForElement('div[id^="catalog-suggestion-"]');
        if (categorySuggestion) categorySuggestion.click();
    }
    await sleep(2000);

    // Brand
    updateStatus("Selecting Brand");
    const brandInput = await waitForElement('input[name="brand"]');
    if (brandInput) {
        brandInput.click();
        await waitForElement('div[id^="suggested-brand-"]');

        const brandSuggestions = document.querySelectorAll('div[id^="suggested-brand-"]');
        let brandFound = false;

        for (let suggestion of brandSuggestions) {
            if (suggestion.textContent.trim().toLowerCase() === data.brand.toLowerCase()) {
                suggestion.click();
                brandFound = true;
                break;
            }
        }

        // If brand is not found, type it in
        if (!brandFound) {
            brandInput.value = data.brand;
            brandInput.dispatchEvent(new Event('input', { bubbles: true }));

            await sleep(2000);

            let brandResult = document.querySelector(`div[aria-label="${data.brand}"]`);
            if (!brandResult) {
                brandResult = document.querySelector('div[id="custom-select-brand"]');
            }
            if (brandResult) brandResult.click();
        }
    }
    await sleep(2000);

    // Handle authenticity modal
    updateStatus("Checking Requirements");
    const authenticityHandled = await handleAuthenticityModal();
    if (authenticityHandled) {
        await sleep(2000);
    }

    // Size
    updateStatus("Selecting Size");
    const sizeInput = await waitForElement('input[id="size"], input[name="size"]');
    if (sizeInput) {
        sizeInput.click();
        await waitForElement('[role="button"], [role="presentation"]', 2000);

        const sizeOptions = document.querySelectorAll('[role="button"], [role="presentation"]');
        const targetSize = data.size.toUpperCase();

        let sizeToClick = Array.from(sizeOptions).find(opt => {
            const text = opt.textContent.trim().toUpperCase();
            return text === targetSize || text.startsWith(targetSize + " /");
        });

        if (!sizeToClick) {
            sizeToClick = Array.from(sizeOptions).find(opt =>
                opt.textContent.trim().toLowerCase() === "other"
            );
        }

        if (sizeToClick) sizeToClick.click();
    }
    await sleep(2000);

    // Condition
    updateStatus("Selecting Condition");
    const conditionInput = await waitForElement('input[name="condition"]');
    if (conditionInput) {
        conditionInput.click();
        await waitForElement('[role="button"]');

        const targetCondition = conditionMap[data.condition] || "New with tags";
        const conditionOptions = document.querySelectorAll('[role="button"]');

        const conditionToClick = Array.from(conditionOptions).find(option =>
            option.textContent.includes(targetCondition)
        );

        if (conditionToClick) conditionToClick.click();
    }
    await sleep(2000);

    // Colors
    updateStatus("Selecting Colors");
    const colorInput = await waitForElement('input[name="color"]');
    if (colorInput) {
        colorInput.click();
        await waitForElement('div[id^="suggested-color-"]');

        const suggestedColors = document.querySelectorAll('div[id^="suggested-color-"]');
        for (let i = 0; i < Math.min(suggestedColors.length, 2); i++) {
            suggestedColors[i].click();
            await sleep(500);
        }
    }
}

async function setInputValue(selector, value) {
    const input = await waitForElement(selector);
    if (input) {
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

async function slowTypeInputValue(selector, value) {
    const input = await waitForElement(selector);
    if (input) {
        input.value = "";
        input.focus();

        for (let char of value) {
            input.value += char;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            await sleep(500);
        }

        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
    }
}

async function fillForm() {
    updateStatus("Filling Details");
    await setInputValue('input[name="title"]', data.title);
    await setInputValue('textarea[name="description"]', data.description);
    await sleep(2000);
    await fillDropdowns();

    updateStatus("Finalizing Price");
    await slowTypeInputValue('input[name="price"]', data.price);

    const uploadButton = await waitForElement('button[data-testid="upload-form-save-button"]');
    if (uploadButton) {
        updateStatus("Ready to Upload!");
        uploadButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(2000);

        if (!uploadButton.disabled) {
            // uploadButton.click();
            updateStatus("Item uploaded!");
            await sleep(2000);
            hideStatus();
        } else {
            console.error("Error: Upload failed!");
            updateStatus("Error: Upload failed!");
            await sleep(2000);
        }
    }
}

if (window.location.href.includes("vinted.com/items/new")) {
    setTimeout(async () => {
        enableInputBlocking();
        try {
            await uploadImages(data.images);
            await fillForm();
        } catch (e) {
            console.error(e);
        } finally {
            disableInputBlocking();
        }
    }, 2000);
}