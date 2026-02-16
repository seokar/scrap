# استفاده از ایمیج رسمی که Puppeteer پیشنهاد می‌کند
FROM ghcr.io/puppeteer/puppeteer:22.4.1

# تغییر کاربر به root برای نصب پکیج‌ها (در صورت نیاز)
USER root

# تنظیم متغیرهای محیطی
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

# کپی کردن فایل‌های پروژه
COPY package*.json ./
RUN npm ci

COPY . .

# برگشت به کاربر عادی برای امنیت
USER pptruser

CMD [ "node", "index.js" ]
