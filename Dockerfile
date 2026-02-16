# استفاده از نسخه سبک Node.js
FROM node:18-slim

# نصب Chromium و وابستگی‌های لازم برای اجرا
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && apt-get install -y chromium \
    && apt-get install -y fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    && rm -rf /var/lib/apt/lists/*

# تنظیم متغیرهای محیطی برای اینکه Puppeteer بداند کروم کجاست
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# تنظیم دایرکتوری کاری
WORKDIR /usr/src/app

# کپی کردن فایل‌ها
COPY package*.json ./
RUN npm install

COPY . .

# دسترسی پورت
EXPOSE 3000

# اجرای برنامه
CMD [ "node", "index.js" ]
