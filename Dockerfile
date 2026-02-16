FROM ghcr.io/puppeteer/puppeteer:22.4.1

USER root

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /usr/src/app

COPY package*.json ./

# اینجا حتما باید install باشد نه ci
RUN npm install

COPY . .

USER pptruser

CMD [ "node", "index.js" ]
