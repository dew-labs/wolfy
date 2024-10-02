FROM oven/bun:alpine as base

WORKDIR /satoru

RUN mkdir apps

COPY package.json ./
COPY bun.lockb ./

COPY packages ./packages
COPY apps/keeper/package.json ./apps/keeper/package.json

# Install project dependencies using bun
RUN bun install --frozen-lockfile

COPY tokens.sepolia.json ./
COPY contracts.sepolia.json ./
COPY tsconfig.json ./


FROM base as keeper

WORKDIR /satoru/apps/keeper

COPY apps/keeper/src ./src
COPY apps/keeper/tsconfig.json ./tsconfig.json

# Define the command to run your application
CMD ["bun", "run", "sepolia"]
