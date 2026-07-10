# Standalone image for the Bordiko web client.
#
# Build context is THIS directory, so the frontend can live in its own repo. The
# browser calls the gateway directly, so VITE_GATEWAY_URL is baked at build time.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG VITE_GATEWAY_URL=http://localhost:8080
ENV VITE_GATEWAY_URL=${VITE_GATEWAY_URL}
RUN npx vite build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback so clean-path deep links (/games/hive, /play/{id}) don't 404.
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
