FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json nest-cli.json ./

RUN npm ci

COPY apps/ ./apps
COPY libs/ ./libs

ARG SERVICE_NAME
RUN npx nest build ${SERVICE_NAME}

RUN npm prune --production

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

ARG SERVICE_NAME
ENV SERVICE=${SERVICE_NAME}

CMD npm run start:prod:${SERVICE}
