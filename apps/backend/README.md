# Wolfy Backend

Wolfy backend is a backend service designed to expose api for various data like trading history, analytics ,...

## Local Environment Setup

### Setup steps

```bash
git clone https://github.com/dew-labs/wolfy.git
cd wolfy/apps/backend
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
docker build -f apps/backend/Dockerfile -t backend .
```

### 3. Deploy onto Fly.io

```bash
# Launch
fly launch --org dew-labs --config apps/backend/fly.sepolia.toml

# Inject secrets
flyctl secrets import --app wolfy-backend-sepolia < .env.sepolia

# Deploy
fly deploy --config apps/backend/fly.sepolia.toml

# Tail logs
fly logs --app wolfy-backend-sepolia

```
