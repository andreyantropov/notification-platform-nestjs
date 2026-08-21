# --- Build Arguments ---
    ARG NODE_VERSION=24
    ARG SERVICE_NAME

# --- Stage 1: Builder ---
    FROM node:${NODE_VERSION}-alpine AS builder
    WORKDIR /app

    ARG HTTP_PROXY
    ARG HTTPS_PROXY
    ARG http_proxy
    ARG https_proxy

    ENV NODE_USE_ENV_PROXY=1 \
        HTTP_PROXY=$HTTP_PROXY \
        HTTPS_PROXY=$HTTPS_PROXY \
        http_proxy=$http_proxy \
        https_proxy=$https_proxy \
        npm_config_proxy=$HTTP_PROXY \
        npm_config_https_proxy=$HTTPS_PROXY \
        NPM_CONFIG_PROXY=$HTTP_PROXY \
        NPM_CONFIG_HTTPS_PROXY=$HTTPS_PROXY

    ENV PNPM_HOME="/pnpm"
    ENV PATH="$PNPM_HOME:$PATH"
    RUN corepack enable

    COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nest-cli.json tsconfig*.json ./
    RUN pnpm install --frozen-lockfile

    COPY . .

    ARG SERVICE_NAME
    RUN pnpm run build:${SERVICE_NAME}
    RUN pnpm prune --prod

# --- Stage 2: Runner ---
    FROM node:${NODE_VERSION}-alpine AS runner
    WORKDIR /app

    RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodejs

    COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
    COPY --from=builder --chown=nodejs:nodejs /app/dist/apps/${SERVICE_NAME} ./dist/apps/${SERVICE_NAME}
    COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

    RUN ln -s /app/dist/apps/${SERVICE_NAME} /app/dist/current && chown -h nodejs:nodejs /app/dist/current

    USER nodejs

    CMD ["node", "./dist/current/main.js"]
