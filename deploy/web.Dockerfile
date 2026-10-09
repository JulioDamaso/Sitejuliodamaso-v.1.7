FROM node:24-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/pocketbase/package.json apps/pocketbase/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

COPY . .
ARG VITE_GOOGLE_OAUTH_CLIENT_ID
ENV NODE_ENV=production
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID
RUN npm run build --workspace web

FROM nginx:1.29-alpine
COPY deploy/web-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/web /usr/share/nginx/html
EXPOSE 80

