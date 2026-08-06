FROM node:lts-alpine

WORKDIR /app
ENV DATABASE_URL="file:./prisma/dev.db"

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]
