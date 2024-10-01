FROM oven/bun:alpine as base

WORKDIR /satoru

RUN apk add mise --repository=https://dl-cdn.alpinelinux.org/alpine/v3.20/community/

ARG MISE_ENV
ENV MISE_ENV ${MISE_ENV}

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
COPY apps/keeper/entrypoint.sh ./entrypoint.sh
COPY apps/keeper/tsconfig.json ./tsconfig.json

RUN chmod +x ./entrypoint.sh
ENTRYPOINT ["./entrypoint.sh"]
# Define the command to run your application
CMD ["bun", "run", "start"]
