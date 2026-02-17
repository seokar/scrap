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
                '--window-size=1920,1080',
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: execPath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        // دریافت اولین تب
        let initialPage = (await browser.pages())[0];

        // جعل هویت
        await initialPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

        // مسدودسازی منابع برای سرعت و جلوگیری از کرش
        await initialPage.setRequestInterception(true);
        initialPage.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navigating to: ${targetUrl}`);

        try {
            // تلاش برای رفتن به صفحه (اگر خطا داد مهم نیست)
            await initialPage.goto(targetUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 25000 
            });
        } catch (e) {
            console.log("Navigation interrupted (likely redirect/detached). Continuing...");
        }

        // صبر حیاتی برای تکمیل ریدایرکت‌ها
        console.log("Waiting for page to settle...");
        await wait(4000);

        // *** بخش اصلی اصلاح شده ***
        // دیگر از initialPage استفاده نمی‌کنیم چون ممکن است مرده باشد.
        // لیست تمام صفحات فعلی مرورگر را می‌گیریم.
        const allPages = await browser.pages();
        let content = null;
        let success = false;

        console.log(`Checking ${allPages.length} active tabs...`);

        // تک تک تب‌ها را چک می‌کنیم تا ببینیم کدام یک زنده است و محتوا دارد
        for (const p of allPages) {
            try {
                const c = await p.content();
                if (c && c.length > 500) { // اگر محتوا معتبر بود
                    content = c;
                    success = true;
                    break; // صفحه درست را پیدا کردیم!
                }
            } catch (err) {
                console.log("Found a detached/dead frame, skipping...");
            }
        }

        if (success && content) {
            res.send(content);
        } else {
            throw new Error("No active page content could be retrieved.");
        }

    } catch (error) {
        console.error('Final Error:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
