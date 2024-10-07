FROM oven/bun:alpine AS base

WORKDIR /satoru

ARG NET
ENV NET=${NET}

RUN mkdir apps

COPY package.json ./
COPY bun.lockb ./

COPY packages ./packages
COPY apps/indexer/package.json ./apps/indexer/package.json

# TODO: checkout --frozen-lockfile
RUN bun install

COPY tokens.${NET}.json ./
COPY contracts.${NET}.json ./
COPY tsconfig.json ./

FROM base AS indexer

WORKDIR /satoru/apps/indexer

COPY apps/indexer/src ./src
COPY apps/indexer/.checkpoint ./.checkpoint
COPY apps/indexer/tsconfig.json ./tsconfig.json

EXPOSE 3001
CMD ["bun", "run", "start"]
