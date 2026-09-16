FROM node:22-bookworm-slim AS dependencies

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 5000
CMD ["npm", "start"]
