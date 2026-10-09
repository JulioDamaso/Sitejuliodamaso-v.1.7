FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/pocketbase/package.json apps/pocketbase/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci --omit=dev

COPY apps/api apps/api
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "src/main.js"]

