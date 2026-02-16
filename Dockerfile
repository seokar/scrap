FROM ghcr.io/puppeteer/puppeteer:22.4.1

USER root

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    PORT=3000

WORKDIR /usr/src/app

COPY package*.json ./

# نصب پکیج‌ها
RUN npm install

COPY . .

# دسترسی‌های لازم را به یوزر بدهیم
RUN chown -R pptruser:pptruser /usr/src/app

USER pptruser

# اعلام پورت به Railway
EXPOSE 3000

CMD [ "node", "index.js" ]
