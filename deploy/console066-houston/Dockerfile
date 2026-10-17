# Houston upstream is MIT licensed: https://github.com/gethouston/houston
# Build the real host/runtime and official web client from a pinned revision.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /houston
RUN git clone --filter=blob:none https://github.com/gethouston/houston.git . && git checkout --detach 597cba982c0cb725edc92237d9be7a40db69a6ff
RUN pnpm install --frozen-lockfile --filter houston-ai --filter houston-app... --filter houston-web... --filter @houston/runtime... --filter @houston/host...
COPY deploy/console066-houston/patch-runtime-limits.mjs /tmp/patch-runtime-limits.mjs
RUN node /tmp/patch-runtime-limits.mjs
RUN node selfhost/bundle.mjs
RUN VITE_NEW_ENGINE=1 pnpm --filter houston-web build
# Keep source, built output and license; production dependencies install below.
RUN tar --exclude=.git --exclude=node_modules -czf /houston-source.tgz .

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends git python3 curl wget ca-certificates chromium ffmpeg fonts-dejavu-core && rm -rf /var/lib/apt/lists/*
RUN npm install --prefix /opt/llave-render hyperframes@0.8.149 gsap@3.14.2
# Install only the official CLI. No server, credentials, model calls or fallback
# are enabled by installation. Pin and smoke-test the binary during the build.
RUN npm install --prefix /opt/llave-opencode @opencode/cli@2.0.32 && ln -s /opt/llave-opencode/node_modules/.bin/opencode /usr/local/bin/opencode && opencode --version
RUN corepack enable
WORKDIR /houston
COPY --from=build /houston-source.tgz /tmp/houston-source.tgz
RUN tar -xzf /tmp/houston-source.tgz && rm /tmp/houston-source.tgz && pnpm install --frozen-lockfile --prod --filter @houston/runtime... --filter @houston/host... && ln -s /houston/node_modules/.pnpm/node_modules /houston/dist/host/node_modules && ln -s /houston/node_modules/.pnpm/node_modules /houston/dist/runtime/node_modules
COPY deploy/console066-houston/operations-loop.mjs /houston/operations-loop.mjs
COPY deploy/console066-houston/gateway.mjs /houston/gateway.mjs
COPY deploy/console066-houston/bootstrap.mjs /houston/bootstrap.mjs
COPY deploy/console066-houston/llave-context.mjs /houston/llave-context.mjs
COPY deploy/console066-houston/video-renderer.mjs /houston/video-renderer.mjs
COPY deploy/console066-houston/studio-encoder.mjs /houston/studio-encoder.mjs
COPY deploy/console066-houston/video-composition.mjs /houston/video-composition.mjs
COPY public/assets/muestra/muestra-cover-front.webp /houston/video-assets/cover.webp
RUN cp /opt/llave-render/node_modules/gsap/dist/gsap.min.js /houston/video-assets/gsap.min.js
COPY agents/ /houston/llave-agents/
COPY deploy/console066-houston/opencode/ /houston/llave-opencode/
ENV NODE_ENV=production HOUSTON_HOME=/data HOUSTON_HOST_BIND=127.0.0.1 HOUSTON_HOST_PORT=4318 HOUSTON_RUNTIME_COMMAND="node /houston/dist/runtime/main.mjs" HOUSTON_MAX_WARM_RUNTIMES=3
# Startup owns the mounted directories, then drops to node before launching agents.
EXPOSE 8080
CMD ["node", "gateway.mjs"]
