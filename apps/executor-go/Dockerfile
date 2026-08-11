FROM golang:1.25-bookworm AS go-build

WORKDIR /workspace
COPY packages/workflow-protocol ./packages/workflow-protocol
COPY apps/executor-go ./apps/executor-go

WORKDIR /workspace/apps/executor-go
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/executor ./cmd/executor

FROM node:22-bookworm-slim AS node-dependencies

ENV HUSKY=0
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages ./packages
COPY apps/web/package.json ./apps/web/package.json
COPY apps/server/package.json ./apps/server/package.json
COPY apps/executor-go ./apps/executor-go
RUN corepack enable \
  && pnpm install --prod --frozen-lockfile --ignore-scripts

FROM node:22-bookworm-slim

ENV NODE_ENV=production \
  CODE_NODE_BINARY=node \
  CODE_NODE_MODULES_PATH=/workspace/node_modules
WORKDIR /workspace

COPY --from=node-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=go-build --chown=node:node /out/executor ./executor
COPY --chown=node:node apps/executor-go/docker-entrypoint.sh ./docker-entrypoint.sh

USER node
ENTRYPOINT ["sh", "/workspace/docker-entrypoint.sh"]
