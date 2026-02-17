const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--no-zygote',
                '--window-size=1920,1080', // سایز پنجره استاندارد
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: execPath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        // دریافت اولین تب باز شده (به جای ساخت تب جدید برای صرفه جویی در رم)
        let pages = await browser.pages();
        let page = pages[0];

        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

        // مسدودسازی منابع سنگین
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // استایل شیت را هم می‌بندیم تا سرعت بالا برود و رم کم نیاید
            if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navigating to: ${targetUrl}`);

        try {
            // تلاش برای رفتن به صفحه
            await page.goto(targetUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000 
            });
        } catch (e) {
            // مدیریت خطای معروف Detached Frame
            if (e.message.includes('detached') || e.message.includes('Target closed')) {
                console.log("Redirect detected or Frame detached. Continuing...");
            } else {
                console.log("Navigation error (non-fatal):", e.message);
            }
        }

        // صبر اجباری برای لود شدن محتوای جاوااسکریپتی یا تکمیل ریدایرکت
        console.log("Waiting for content to settle...");
        await wait(4000);

        // تلاش برای پیدا کردن صفحه زنده
        // اگر ریدایرکت شده باشد، ممکن است آبجکت page قبلی مرده باشد
        // پس دوباره لیست صفحات را می‌گیریم
        pages = await browser.pages();
        page = pages[pages.length - 1]; // آخرین تب فعال را انتخاب می‌کنیم

        if (!page) {
            throw new Error("No active pages found after navigation.");
        }

        const content = await page.content();
        res.send(content);

    } catch (error) {
        console.error('Final Error:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    } finally {
        if (browser) {
            // بستن مرورگر
            await browser.close().catch(() => console.log("Error closing browser"));
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
