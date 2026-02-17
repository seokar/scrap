const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

// تابع تاخیر (Wait)
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
                '--no-zygote', // کاهش مصرف رم با جلوگیری از پروسه‌های اضافه
                '--single-process' // ریسکی اما برای رم کم عالی است
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: execPath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // جلوگیری از لود منابع سنگین
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navigating to: ${targetUrl}`);

        try {
            // تلاش برای لود صفحه با تایم‌اوت ۲۰ ثانیه
            await page.goto(targetUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 20000 
            });
        } catch (e) {
            console.log("Navigation timeout. Stabilizing...");
            // اگر تایم‌اوت شد، ۳ ثانیه صبر می‌کنیم تا رفرش‌ها یا ریدایرکت‌های احتمالی تمام شوند
            await wait(3000);
        }

        // تلاش برای خواندن محتوا با مکانیزم تلاش مجدد (Retry)
        let content = '';
        try {
            content = await page.content();
        } catch (contentError) {
            console.log("Context lost, retrying one last time...");
            // اگر ارور Context Destroyed داد، یعنی صفحه رفرش شده. ۲ ثانیه صبر و تلاش مجدد
            await wait(2000);
            try {
                content = await page.content();
            } catch (finalError) {
                 // اگر باز هم نشد، هر چه هست را برگردان
                content = '<html><body><h1>Error: Page is unstable/redirecting loop.</h1></body></html>';
            }
        }

        res.send(content);

    } catch (error) {
        console.error('Critical Server Error:', error);
        res.status(500).send(`Server Error: ${error.message}`);
    } finally {
        if (browser) {
            // بستن با کمی تاخیر برای اطمینان از پاکسازی
            setTimeout(() => browser.close().catch(() => {}), 1000);
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
