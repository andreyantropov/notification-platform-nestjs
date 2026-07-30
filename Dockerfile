FROM node:24-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

FROM base AS builder

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json tsconfig*.json ./

RUN pnpm install --frozen-lockfile

COPY apps/ ./apps
COPY libs/ ./libs

ARG SERVICE_NAME
RUN pnpm run build:${SERVICE_NAME}

RUN pnpm prune --prod

FROM base AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

ARG SERVICE_NAME

COPY --from=builder /app/dist/apps/${SERVICE_NAME}-service ./dist
COPY package.json ./

ENV SERVICE=${SERVICE_NAME}-service

CMD ["node", "--import", "./dist/instrumentation.js", "./dist/main.js"]
