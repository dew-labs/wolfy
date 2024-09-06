# Use a slim version of Node.js as the base image
FROM node:22.6.0-alpine

WORKDIR /satoru-keeper

COPY keeper ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY shared/ ./

# Install pnpm globally
RUN npm install -g pnpm

# Install project dependencies using pnpm
RUN pnpm install

# Define the command to run your application
CMD ["pnpm", "bun", "run", "keeper"]
