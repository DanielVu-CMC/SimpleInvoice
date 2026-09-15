FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ARG VITE_PAGE_SIZE=10
ENV VITE_API_URL=$VITE_API_URL VITE_PAGE_SIZE=$VITE_PAGE_SIZE
RUN npm run build

FROM nginx:1.29-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
ENV NGINX_ENVSUBST_FILTER=APP_PORT
EXPOSE 80
