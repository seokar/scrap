const express = require('express');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const app = express();

// استفاده از پورت محیطی یا ۳۰۰۰
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
    const targetUrl = req.query.url;

    if (!targetUrl) {
        return res.status(400).send('Error: Missing "url" parameter.');
    }

    console.log(`Processing URL: ${targetUrl}`); // لاگ برای دیباگ

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // جلوگیری از کرش مموری
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', 
                '--disable-gpu'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();
        
        // تنظیم تایم‌اوت کلی برای نویگیشن
        page.setDefaultNavigationTimeout(60000); 

        await page.setViewport({ width: 1920, height: 1080 });

        await page.goto(targetUrl, { 
            waitUntil: 'domcontentloaded', // کمی سبک‌تر از networkidle2 برای جلوگیری از تایم‌اوت
            timeout: 60000 
        });

        const content = await page.content();
        await browser.close();
        
        res.send(content);

    } catch (error) {
        console.error("Error processing request:", error);
        if (browser) await browser.close();
        res.status(500).json({ error: error.message });
    }
});

// تغییر مهم: اضافه کردن '0.0.0.0'
app.listen(port, '0.0.0.0', () => {
    console.log(`Proxy running on port ${port}`);
});
