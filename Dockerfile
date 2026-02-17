FROM node:18-slim

# نصب کتابخانه‌های سیستمی ضروری برای کروم
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libnss3 \
    libnspr4 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# نصب پکیج‌ها
RUN npm install

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
