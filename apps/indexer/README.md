# Wolfy Indexer

Indexer is a backend service designed to index the blockchain data and store it in a database

## Local Environment Setup

### Setup steps

```bash
git clone https://github.com/dew-labs/satoru.git
cd satoru/apps/indexer
```

Install [mise](https://mise.jdx.dev/getting-started.html)

```bash
curl https://mise.run | sh
```

Install [bun](https://bun.sh/docs/installation)

```bash
mise install
```

Install dependencies

```bash
bun install
```

### Dev server start

```bash
bun run sepolia:dev
```

## Deployment

### 1. Change the directory to root

### 2. Build Docker image (for testing )

```bash
docker build --build-arg NET={net} -f apps/indexer/Dockerfile -t indexer .
```

### 3. Deploy onto Fly.io

```bash
# Launch
fly launch --org dew-labs --config apps/indexer/fly.sepolia.toml

# Inject secrets
flyctl secrets import --app wolfy-indexer-sepolia < .env.sepolia

# Deploy
fly deploy --config apps/indexer/fly.sepolia.toml

# Tail logs
fly logs --app wolfy-indexer-sepolia

```
