const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Error: Missing "url" parameter.');
    }

    console.log(`Processing URL: ${targetUrl}`);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            // استفاده از مسیری که در Dockerfile تعریف کردیم
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // حیاتی برای داکر: جلوگیری از کرش مموری
                '--disable-gpu',
                '--no-first-run',
                '--no-zygote',
                '--single-process'
            ]
        });

        const page = await browser.newPage();
        
        // مسدود کردن منابع غیر ضروری برای افزایش سرعت و کاهش رم
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // تنظیم Viewport
        await page.setViewport({ width: 1280, height: 720 });

        // رفتن به آدرس
        await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });

        const content = await page.content();
        res.send(content);

    } catch (error) {
        console.error("Scraping Error:", error);
        res.status(500).send(`Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

// گوش دادن روی تمام پورت‌ها (0.0.0.0) - حیاتی برای Railway
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
