FROM node:22-bookworm-slim AS build

ENV HUSKY=0
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY configs ./configs
COPY packages ./packages
COPY apps/server ./apps/server

RUN corepack enable \
  && pnpm install --frozen-lockfile
RUN pnpm --filter @ai-workflow/server build

FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /workspace/apps/server

COPY --from=build --chown=node:node /workspace/node_modules /workspace/node_modules
COPY --from=build --chown=node:node /workspace/packages /workspace/packages
COPY --from=build --chown=node:node /workspace/apps/server/node_modules ./node_modules
COPY --from=build --chown=node:node /workspace/apps/server/dist ./dist
COPY --from=build --chown=node:node /workspace/apps/server/prisma ./prisma
COPY --from=build --chown=node:node /workspace/apps/server/prisma.config.ts ./prisma.config.ts
COPY --from=build --chown=node:node /workspace/apps/server/package.json ./package.json
COPY --from=build --chown=node:node /workspace/apps/server/public ./public
COPY --chown=node:node apps/server/docker-entrypoint.sh ./docker-entrypoint.sh

RUN mkdir -p logs var/plugin-artifacts var/knowledge-sources \
  && chown -R node:node logs var

USER node
EXPOSE 3000
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
