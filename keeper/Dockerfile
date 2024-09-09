FROM oven/bun:alpine

#######################################################################

WORKDIR /satoru-keeper

COPY keeper/ ./keeper
COPY shared/ ./shared

COPY package.json ./
COPY tokens.sepolia.json ./
COPY contracts.sepolia.json ./
COPY tsconfig.json ./

# Install project dependencies using bun
RUN bun install

LABEL fly_launch_runtime="bun"

# Define the command to run your application
CMD ["bun", "run", "sepolia:keeper"]
