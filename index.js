const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// افزودن پلاگین مخفی‌سازی
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

// مسیر تست سلامت (حتماً این را اضافه کنید تا Railway بفهمد اپ زنده است)
app.get('/health', (req, res) => {
    res.send('OK');
});

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL required');

    let browser = null;
    try {
        console.log('Launching browser...');
        
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // بلاک کردن منابع سنگین برای جلوگیری از کرش
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        const content = await page.content();
        
        res.send(content);

    } catch (error) {
        console.error('Error:', error);
        res.status(500).send(error.message);
    } finally {
        if (browser) await browser.close();
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});
