const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// اضافه کردن پلاگین Stealth برای مخفی کردن ربات بودن
puppeteer.use(StealthPlugin());

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Error: Missing "url" parameter.');
    }

    let browser = null;
    try {
        // راه‌اندازی مرورگر
        browser = await puppeteer.launch({
            headless: "new", // حالت بدون رابط گرافیکی جدید
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', 
                '--disable-gpu'
            ],
            // اگر از داکرفایل بالا استفاده می‌کنید مسیر اجرایی خودکار پیدا می‌شود
        });

        const page = await browser.newPage();

        // تنظیم هدرهای اضافی در صورت نیاز (Stealth خودش اکثر کارها را می‌کند)
        await page.setViewport({ width: 1920, height: 1080 });

        // رفتن به آدرس هدف
        // waitUntil: 'networkidle2' یعنی صبر کن تا شبکه تقریبا بیکار شود (سایت لود شده)
        await page.goto(targetUrl, { 
            waitUntil: 'networkidle2', 
            timeout: 60000 // 60 ثانیه زمان انتظار
        });

        // گرفتن محتوای HTML نهایی (بعد از اجرای جاوااسکریپت‌های سایت)
        const content = await page.content();

        // بستن مرورگر
        await browser.close();

        // ارسال پاسخ به شما
        res.send(content);

    } catch (error) {
        console.error(error);
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Proxy running on port ${port}`);
});
