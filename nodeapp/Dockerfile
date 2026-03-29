# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app

# Copy installed modules and app source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure upload directory exists inside the image


EXPOSE 3000

# Default: just start the app.
# docker-compose overrides this with: node setup.js && node app.js
CMD ["node", "app.js"]
