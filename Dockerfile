FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

# Copy dependency files first so this layer is cached until they change
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the app code, owned by the non-root "node" user
COPY --chown=node:node . .

USER node
EXPOSE 5000
CMD ["node", "server.js"]
