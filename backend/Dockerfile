FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build || echo "No build script, using source as-is"

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
