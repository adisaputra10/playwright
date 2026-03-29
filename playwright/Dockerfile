# Use the official Playwright image — Chromium already installed inside
FROM mcr.microsoft.com/playwright:v1.51.0-noble

WORKDIR /app

# Install dependencies only
COPY package*.json ./
RUN npm ci

# Copy all test files

COPY . .

# By default run all tests
CMD ["npx", "playwright", "test"]
