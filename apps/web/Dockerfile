FROM node:22-bookworm-slim AS build

ENV HUSKY=0
WORKDIR /workspace

COPY package.json pnpm-workspace.yaml .npmrc ./
COPY configs ./configs
COPY packages ./packages
COPY apps/web ./apps/web

RUN corepack enable \
  && pnpm install --no-frozen-lockfile

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter @ai-workflow/web build

FROM nginx:1.27-alpine

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80
