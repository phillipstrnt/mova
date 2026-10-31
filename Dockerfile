FROM node:22-bookworm-slim AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM node:22-bookworm-slim AS app
ENV NODE_ENV=production
ENV PORT=8000
WORKDIR /app
COPY server/package*.json ./server/
RUN npm ci --omit=dev --prefix server
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
COPY deploy-entrypoint.js ./deploy-entrypoint.js
EXPOSE 8000
CMD ["node", "deploy-entrypoint.js"]
