const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

async function getChromiumPath() {
    if (typeof chromium.executablePath === 'function') {
        return await chromium.executablePath();
    }
    return chromium.executablePath;
}

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send('URL is required');

    let browser = null;
    try {
        const execPath = await getChromiumPath();
        
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process', // کاهش مصرف رم
                '--disable-site-isolation-trials',
                '--disable-dev-shm-usage', // حیاتی برای داکر
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu' // گرافیک نداریم، پس خاموش
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: execPath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // 1. مسدودسازی هوشمندانه منابع برای سرعت
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // لیست سیاه منابع غیرضروری
            const blockedTypes = ['image', 'stylesheet', 'font', 'media', 'other'];
            if (blockedTypes.includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // 2. تلاش برای باز کردن سایت با مدیریت تایم‌اوت
        try {
            console.log(`Navigating to: ${targetUrl}`);
            await page.goto(targetUrl, {
                waitUntil: 'domcontentloaded', // صبر تا لود شدن ساختار HTML
                timeout: 25000 // کاهش تایم‌اوت به 25 ثانیه (اگر نشد ولش کن)
            });
        } catch (e) {
            console.log("Timeout reached, but checking if content exists...");
            // اگر تایم‌اوت شد، برنامه را متوقف نمی‌کنیم و ادامه می‌دهیم
            // چون احتمالا محتوا لود شده است
        }

        // دریافت محتوا حتی اگر تایم‌اوت شده باشد
        const content = await page.content();
        res.send(content);

    } catch (error) {
        console.error('Critical Error:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    } finally {
        if (browser) {
            // بستن مرورگر برای آزاد شدن رم
            await browser.close(); 
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
