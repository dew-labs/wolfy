FROM oven/bun:alpine AS base

WORKDIR /satoru

ARG NET
ENV NET=${NET}

RUN mkdir apps

COPY package.json ./
COPY bun.lockb ./

COPY packages ./packages
COPY apps/backend/package.json ./apps/backend/package.json

# TODO: checkout --frozen-lockfile
RUN bun install

COPY tsconfig.json ./

FROM base AS backend

WORKDIR /satoru/apps/backend

COPY apps/backend/src ./src
COPY apps/backend/tsconfig.json ./tsconfig.json
COPY apps/backend/drizzle ./drizzle

ENV NODE_ENV=production
CMD ["bun", "src/index.ts"]

EXPOSE 3000
