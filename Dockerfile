# استفاده از نسخه دبیان (Debian) که برای نصب پکیج‌ها پایدارتر است
FROM node:18-slim

# این بخش حیاتی است: نصب دستی کتابخانه‌هایی که کروم نیاز دارد و در لینوکس خام نیستند
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# کپی کردن فایل‌های پروژه
COPY package*.json ./

# نصب پکیج‌های نود
RUN npm install

# کپی بقیه فایل‌ها
COPY . .

# تنظیم متغیرهای محیطی
ENV PORT=3000
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/app/node_modules/@sparticuz/chromium/bin

# اجرای برنامه
CMD ["node", "index.js"]
