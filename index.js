const express = require('express');
const chromium = require('@sparticuz/chrome-aws-lambda');
// از puppeteer-extra به همراه puppeteer-core استفاده می‌کنیم
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
        // --- تغییر کلیدی اینجاست ---
        // از کروم بهینه شده استفاده می‌کنیم
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // افزایش تایم‌اوت
        page.setDefaultNavigationTimeout(90000); 

        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded',
            timeout: 90000 
        });

        const content = await page.content();
        
        res.send(content);

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Proxy listening on http://0.0.0.0:${port}`);
});
