const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// افزودن پلاگین مخفی‌سازی
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

// تابع کمکی برای پیدا کردن مسیر کروم به هر قیمتی!
async function getChromiumPath() {
    // حالت اول: اگر تابع بود اجراش کن
    if (typeof chromium.executablePath === 'function') {
        return await chromium.executablePath();
    } 
    // حالت دوم: اگر متن بود خودش رو برگردون
    return chromium.executablePath;
}

app.get('/health', (req, res) => {
    res.send('OK - Ready');
});

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('URL required. Usage: /?url=https://site.com');
    }

    let browser = null;
    try {
        // دریافت مسیر اجرایی با تابع هوشمند
        const execPath = await getChromiumPath();
        
        console.log(`Launching Browser... Path: ${execPath}`);

        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-web-security',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: execPath, // مسیر محاسبه شده
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // حذف منابع اضافه برای سرعت
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // رفتن به سایت
        await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });

        const content = await page.content();
        res.send(content);

    } catch (error) {
        console.error('Error Details:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
