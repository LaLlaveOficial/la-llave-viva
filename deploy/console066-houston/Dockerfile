# Houston upstream is MIT licensed: https://github.com/gethouston/houston
# Build the real host/runtime and official web client from a pinned revision.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /houston
RUN git clone --filter=blob:none https://github.com/gethouston/houston.git . && git checkout --detach 597cba982c0cb725edc92237d9be7a40db69a6ff
RUN pnpm install --frozen-lockfile --filter houston-ai --filter houston-web... --filter @houston/runtime... --filter @houston/host...
RUN node selfhost/bundle.mjs
RUN VITE_NEW_ENGINE=1 pnpm --filter houston-web build
# Keep source, built output and license; production dependencies install below.
RUN tar --exclude=.git --exclude=node_modules -czf /houston-source.tgz .

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git python3 curl wget ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /houston
COPY --from=build /houston-source.tgz /tmp/houston-source.tgz
RUN tar -xzf /tmp/houston-source.tgz && rm /tmp/houston-source.tgz && pnpm install --frozen-lockfile --prod --filter @houston/runtime... --filter @houston/host... && ln -s /houston/node_modules/.pnpm/node_modules /houston/dist/host/node_modules && ln -s /houston/node_modules/.pnpm/node_modules /houston/dist/runtime/node_modules
COPY deploy/console066-houston/gateway.mjs /houston/gateway.mjs
ENV NODE_ENV=production HOUSTON_HOME=/data HOUSTON_HOST_BIND=127.0.0.1 HOUSTON_HOST_PORT=4318 HOUSTON_RUNTIME_COMMAND="node /houston/dist/runtime/main.mjs"
# Startup owns the mounted directories, then drops to node before launching agents.
EXPOSE 8080
CMD ["node", "gateway.mjs"]
