const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// فعال‌سازی پلاگین مخفی‌سازی
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.send('OK');
});

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    
    // اگر کاربر url نداد، راهنما را نشان بده
    if (!targetUrl) {
        return res.send('Please provide a url. Example: /?url=https://torob.com');
    }

    let browser = null;
    try {
        console.log(`Starting Stealth browser for: ${targetUrl}`);

        // --- اصلاح مهم برای رفع ارور executablePath ---
        // بررسی می‌کنیم که executablePath تابع است یا متن، تا ارور ندهد
        let execPath;
        if (typeof chromium.executablePath === 'function') {
            execPath = await chromium.executablePath();
        } else {
            execPath = chromium.executablePath;
        }
        
        // اگر مسیری پیدا نشد (محض اطمینان برای دیباگ)
        if (!execPath) {
             throw new Error('Chromium executablePath is null or undefined.');
        }

        console.log(`Using executable path: ${execPath}`);
        // ---------------------------------------------

        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-web-security',
                '--no-sandbox',
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: execPath, // مسیر اصلاح شده را اینجا می‌دهیم
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // بلاک کردن عکس و فونت برای سرعت بیشتر
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // رفتن به سایت هدف
        await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 45000 
        });

        const content = await page.content();
        res.send(content);

    } catch (error) {
        console.error('Scraping Error:', error);
        res.status(500).send(`Error: ${error.message}\nPath issue?`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});
