FROM oven/bun:alpine

#######################################################################

WORKDIR /satoru-keeper

COPY keeper ./
COPY package.json ./
COPY bun.lockb ./
COPY shared/ ./

# Install project dependencies using bun
RUN bun install

LABEL fly_launch_runtime="bun"

# Define the command to run your application
CMD ["bun", "run", "keeper"]
