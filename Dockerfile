FROM node:16-bullseye-slim

# تنظیم متغیرهای محیطی برای عملکرد صحیح
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

# کپی و نصب وابستگی‌ها
COPY package*.json ./
RUN npm install --only=production

# کپی بقیه فایل‌ها
COPY . .

# پورت
ENV PORT=3000
EXPOSE 3000

# اجرا
CMD ["node", "index.js"]
