# DevOps Labs app: web UI and backend in one container.
ARG NODE_IMAGE=node:24.22.0-trixie-slim

FROM ${NODE_IMAGE} AS build
WORKDIR /opt/devops-labs/app
COPY app/package.json app/package-lock.json ./
RUN cd /opt/devops-labs/app && npm ci --no-audit --no-fund
COPY app/ ./
RUN cd /opt/devops-labs/app && npm run build && npm prune --omit=dev --no-audit --no-fund

FROM ${NODE_IMAGE}
LABEL org.devopslabs.project=devops-labs
ENV NODE_ENV=production DEVOPS_LABS_ROOT=/opt/devops-labs
WORKDIR /opt/devops-labs/app
COPY --from=build /opt/devops-labs/app/node_modules ./node_modules
COPY --from=build /opt/devops-labs/app/dist ./dist
COPY app/package.json ./package.json
COPY app/server ./server
COPY versions.json /opt/devops-labs/versions.json
COPY environments /opt/devops-labs/environments
COPY addons /opt/devops-labs/addons
COPY labs /opt/devops-labs/labs
EXPOSE 8800
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:8800/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "server/index.js"]
