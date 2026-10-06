FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy dependency files first so this layer is cached until they change
COPY package.json package-lock.json ./
# Production deps only, with install scripts disabled (no third-party code runs at install time).
# Then remove npm itself: the app runs with plain "node", and npm's bundled packages
# are a common source of scanner findings.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

# Copy the app code, owned by the non-root "node" user
COPY --chown=node:node . .

USER node
EXPOSE 5000
CMD ["node", "server.js"]
