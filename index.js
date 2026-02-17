const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// فعال‌سازی پلاگین مخفی‌سازی برای عبور از تشخیص ربات
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

// تابع کمکی برای پیدا کردن مسیر اجرایی کروم
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
        
        console.log('Launching browser...');
        
        browser = await puppeteer.launch({
            args: [
                ...chromium.args,
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-site-isolation-trials',
                '--disable-dev-shm-usage', // حیاتی برای جلوگیری از کرش رم
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-gpu',
                '--no-zygote',
                // نکته مهم: --single-process را حذف کردیم چون باعث کرش می‌شد
            ],
            defaultViewport: chromium.defaultViewport,
            executablePath: execPath,
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        const page = await browser.newPage();

        // 1. تنظیم هویت جعلی (بسیار مهم برای سایت ترب)
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');

        // 2. مسدودسازی منابع برای سرعت
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // فقط عکس و فونت و مدیا را می‌بندیم. استایل را نگه می‌داریم تا ساختار به هم نریزد
            if (['image', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`Navigating to: ${targetUrl}`);

        // 3. استراتژی جدید ناوبری: فقط منتظر می‌مانیم ارتباط اولیه برقرار شود
        // waitUntil: 'commit' یعنی به محض اینکه سرور جواب داد، کافیه. منتظر لود کامل نمی‌مانیم.
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded', 
            timeout: 45000 // 45 ثانیه فرصت
        });

        console.log('Page loaded, waiting for dynamic content...');
        
        // 4. یک مکث کوتاه ثابت برای اطمینان از لود شدن محتوای جاوااسکریپتی
        await new Promise(r => setTimeout(r, 3000));

        // 5. دریافت محتوا
        const content = await page.content();
        res.send(content);

    } catch (error) {
        console.error('Error occurred:', error);
        
        // حتی اگر ارور داد، سعی می‌کنیم اگر محتوایی هست آن را برگردانیم
        try {
            if (browser) {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    const content = await pages[0].content();
                    return res.send(content);
                }
            }
        } catch (secondaryError) {
             // اگر اینجا هم ارور داد یعنی کلا مرورگر مرده است
        }

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
