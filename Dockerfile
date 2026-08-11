FROM node:22-bookworm-slim AS workspace-dependencies

ENV HUSKY=0
WORKDIR /workspace

COPY package.json pnpm-workspace.yaml .npmrc ./
COPY configs ./configs
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/server ./apps/server
COPY apps/executor-go ./apps/executor-go

RUN corepack enable \
  && pnpm install --no-frozen-lockfile

FROM workspace-dependencies AS web-build

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter @ai-workflow/web build

FROM workspace-dependencies AS server-build

RUN DATABASE_URL=postgresql://localhost:5432/ai_workflow_build \
  pnpm --filter @ai-workflow/server build

FROM golang:1.25-bookworm AS executor-build

ARG GOPROXY=https://goproxy.cn,direct
ENV GOPROXY=${GOPROXY}
WORKDIR /workspace

COPY packages/workflow-protocol/go.mod packages/workflow-protocol/go.sum ./packages/workflow-protocol/
COPY apps/executor-go/go.mod apps/executor-go/go.sum ./apps/executor-go/

WORKDIR /workspace/apps/executor-go
RUN go mod download

WORKDIR /workspace
COPY packages/workflow-protocol ./packages/workflow-protocol
COPY apps/executor-go ./apps/executor-go

WORKDIR /workspace/apps/executor-go
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags='-s -w' -o /out/executor ./cmd/executor

FROM node:22-bookworm-slim

ENV NODE_ENV=production \
  CODE_NODE_BINARY=node \
  CODE_NODE_MODULES_PATH=/workspace/node_modules
WORKDIR /workspace

RUN apt-get update \
  && apt-get install -y --no-install-recommends nginx \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p \
    /workspace/apps/server/logs \
    /workspace/apps/server/var/plugin-artifacts \
    /workspace/apps/server/var/knowledge-sources \
    /workspace/apps/executor-go \
    /workspace/deploy \
    /workspace/web \
  && chown -R node:node /workspace

COPY --from=workspace-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=server-build --chown=node:node /workspace/packages ./packages
COPY --from=server-build --chown=node:node /workspace/apps/server/node_modules ./apps/server/node_modules
COPY --from=server-build --chown=node:node /workspace/apps/server/dist ./apps/server/dist
COPY --from=server-build --chown=node:node /workspace/apps/server/prisma ./apps/server/prisma
COPY --from=server-build --chown=node:node /workspace/apps/server/prisma.config.ts ./apps/server/prisma.config.ts
COPY --from=server-build --chown=node:node /workspace/apps/server/package.json ./apps/server/package.json
COPY --from=server-build --chown=node:node /workspace/apps/server/public ./apps/server/public
COPY --from=web-build --chown=node:node /workspace/apps/web/dist ./web
COPY --from=executor-build --chown=node:node /out/executor ./executor
COPY --chown=node:node apps/server/docker-entrypoint.sh ./apps/server/docker-entrypoint.sh
COPY --chown=node:node apps/executor-go/docker-entrypoint.sh ./apps/executor-go/docker-entrypoint.sh
COPY --chown=node:node deploy/app-entrypoint.sh ./deploy/app-entrypoint.sh
COPY deploy/app-nginx.conf /etc/nginx/nginx.conf

USER node
EXPOSE 3000 8080
ENTRYPOINT ["sh", "/workspace/deploy/app-entrypoint.sh"]
CMD ["web"]
