const express = require('express');
const chromium = require('@sparticuz/chromium');

// --- تغییر حیاتی اینجاست ---
// به جای puppeteer-core، ما puppeteer-extra را صدا می‌زنیم
// تا قابلیت .use() فعال شود.
const puppeteer = require('puppeteer-extra'); 

// پلاگین مخفی‌سازی (هدف اصلی ما)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
// ---------------------------

const app = express();
const port = process.env.PORT || 3000;

app.get('/health', (req, res) => {
    res.send('OK');
});

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL required');

    let browser = null;
    try {
        console.log(`Launching Stealth browser for: ${targetUrl}`);
        
        // تنظیمات گرافیکی برای دور زدن تشخیص ربات
        // این بخش را تغییر ندادم چون برای Railway عالی بود
        browser = await puppeteer.launch({
            args: [
                ...chromium.args, 
                '--disable-web-security', 
                '--disable-features=IsolateOrigins,site-per-process' // کمک به لود شدن فریم‌ها
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();
        
        // تنظیم User-Agent تصادفی یا ثابت (اختیاری ولی توصیه شده برای طبیعی‌تر شدن)
        // فعلاً می‌گذاریم خود StealthPlugin کارش را بکند

        // بلاک کردن منابع برای سرعت (همان تنظیمات قبلی شما)
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // تایم‌اوت را کمی بالا می‌بریم که اگر سایت سنگین بود کرش نکند
        await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 40000 
        });

        const content = await page.content();
        res.send(content);

    } catch (error) {
        console.error('Scraping Error:', error);
        res.status(500).send(`Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port}`);
});
