FROM node:22-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY pocketbase ./pocketbase

CMD ["node", "pocketbase/bootstrap.mjs"]
