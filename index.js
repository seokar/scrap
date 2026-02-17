const express = require('express');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// فعال‌سازی پلاگین مخفی‌سازی ربات
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

// تنظیمات گرافیکی برای کاهش بار روی سرور
chromium.setGraphicsMode = false; 

// تابعی برای شبیه‌سازی انتظار
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getBrowser() {
    const executablePath = await chromium.executablePath();
    
    return await puppeteer.launch({
        args: [
            ...chromium.args,
            '--disable-gpu',
            '--disable-dev-shm-usage', // استفاده از /tmp به جای shared memory
            '--disable-setuid-sandbox',
            '--no-sandbox',
            '--no-zygote',
            '--single-process', // حیاتی برای جلوگیری از Detached Frame در کانتینرهای کوچک
            '--disable-features=IsolateOrigins,site-per-process', // جلوگیری از ایزوله شدن فریم‌ها
            '--disable-web-security',
            '--window-size=1366,768'
        ],
        defaultViewport: { width: 1366, height: 768 },
        executablePath: executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
        timeout: 60000 // افزایش زمان انتظار برای لانچ
    });
}

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;
    
    // اعتبارسنجی ورودی
    if (!targetUrl || !targetUrl.startsWith('http')) {
        return res.status(400).send('Invalid or missing URL parameter.');
    }

    let browser = null;
    let page = null;

    try {
        console.log(`[START] Processing: ${targetUrl}`);
        
        browser = await getBrowser();
        
        // باز کردن یک صفحه جدید (امن‌تر از استفاده از صفحه پیش‌فرض)
        page = await browser.newPage();

        // **جعل هویت کامل**
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9,fa;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Upgrade-Insecure-Requests': '1'
        });

        // **بهینه‌سازی منابع (بسیار مهم برای جلوگیری از کرش)**
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const rType = req.resourceType();
            // مسدود کردن تمام چیزهایی که متن نیستند
            if (['image', 'media', 'font', 'stylesheet', 'other'].includes(rType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // مدیریت ریدایرکت‌ها در حین نویگیشن
        page.on('dialog', async dialog => {
            console.log('Dialog dismissed:', dialog.message());
            await dialog.dismiss();
        });

        // **تلاش اصلی برای رفتن به صفحه**
        try {
            await page.goto(targetUrl, {
                waitUntil: 'domcontentloaded', // سریع‌تر از networkidle
                timeout: 45000 // 45 ثانیه فرصت
            });
        } catch (navError) {
            // اگر خطای تایم‌اوت بود ولی صفحه باز شده، ادامه می‌دهیم
            console.log(`Navigation Notice: ${navError.message}`);
        }

        // کمی صبر برای رندر شدن JS (سایت‌های CSR مثل ترب)
        await wait(2000);

        // **استخراج محتوا با روش ایمن**
        // استفاده از evaluate امن‌تر از content() است چون در کانتکست صفحه اجرا می‌شود
        const content = await page.evaluate(() => {
            return document.documentElement.outerHTML;
        });

        if (!content || content.length < 200) {
            throw new Error("Page loaded but content is empty.");
        }

        console.log(`[SUCCESS] Retrieved ${content.length} bytes.`);
        res.send(content);

    } catch (error) {
        console.error(`[ERROR] Failed to scrape: ${error.message}`);
        
        // مدیریت خطاهای خاص
        if (error.message.includes('Detached Frame') || error.message.includes('Target closed')) {
            res.status(503).send('Server Busy: Browser process crashed due to high load. Please try again.');
        } else {
            res.status(500).send(`Scraping Error: ${error.message}`);
        }

    } finally {
        // **پاکسازی حافظه با شدت بالا**
        if (page) {
            try { await page.close(); } catch (e) {}
        }
        if (browser) {
            try { 
                await browser.close(); 
                // اطمینان از بسته شدن پروسه
                const pages = await browser.pages().catch(() => []); 
                pages.map(p => p.close().catch(() => {}));
            } catch (e) {
                console.log("Error forcing browser close:", e.message);
            }
        }
    }
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is ready on port ${port}`);
});
