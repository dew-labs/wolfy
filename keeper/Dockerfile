FROM oven/bun:alpine

#######################################################################

WORKDIR /satoru-keeper

COPY package.json ./
COPY bun.lockb ./

# Install project dependencies using bun
RUN bun install --frozen-lockfile

COPY keeper/ ./keeper
COPY shared/ ./shared

COPY tokens.sepolia.json ./
COPY contracts.sepolia.json ./
COPY tsconfig.json ./

LABEL fly_launch_runtime="bun"

# Define the command to run your application
CMD ["bun", "run", "sepolia:keeper"]
