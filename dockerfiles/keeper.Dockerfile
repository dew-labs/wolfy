FROM oven/bun:alpine AS base

WORKDIR /satoru

ARG NET
ENV NET=${NET}

RUN mkdir apps

COPY package.json ./
COPY bun.lockb ./

COPY packages ./packages
COPY apps/keeper/package.json ./apps/keeper/package.json

# TODO: checkout --frozen-lockfile
RUN bun install

COPY tokens.${NET}.json ./
COPY contracts.${NET}.json ./
COPY tsconfig.json ./

FROM base AS keeper

WORKDIR /satoru/apps/keeper

COPY apps/keeper/src ./src
COPY apps/keeper/tsconfig.json ./tsconfig.json

CMD ["bun", "run", "start"]
