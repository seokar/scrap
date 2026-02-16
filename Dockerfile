# استفاده از ایمیج رسمی که Puppeteer پیشنهاد می‌کند
FROM ghcr.io/puppeteer/puppeteer:22.4.1

# تغییر کاربر به root برای نصب پکیج‌ها
USER root

# تنظیم متغیرهای محیطی برای جلوگیری از دانلود دوباره کروم
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# کپی کردن فایل‌های پروژه
COPY package*.json ./

# --- تغییر مهم اینجاست ---
# به جای npm ci از npm install استفاده می‌کنیم
RUN npm install

# کپی کردن بقیه فایل‌ها
COPY . .

# برگشت به کاربر عادی برای امنیت (مهم برای Puppeteer)
USER pptruser

CMD [ "node", "index.js" ]
