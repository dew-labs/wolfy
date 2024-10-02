# Wolfy Keeper

Keeper is a backend service designed to detect specific conditions, such as price changes or liquidation thresholds, and triggering automated actions in response

## Tools

- bun 1.1.26
- mise (package manager)

## Local Environment Setup

### Setup steps

```bash
git clone https://github.com/dew-labs/satoru.git
cd satoru/apps/keeper
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

### Build Docker image

```bash
docker build --build-arg MISE_ENV={env} -f apps/keeper/Dockerfile -t keeper .
```

### Deploy onto Fly.io

```bash
# Launch
fly launch --org dew-labs --config keeper/fly.sepolia.toml

# Inject secrets
flyctl secrets import --app wolfy-keeper-sepolia < .env.sepolia

# Deploy
fly deploy --app wolfy-keeper-sepolia --dockerfile apps/keeper/Dockerfile --config fly.sepolia.toml --build-arg MISE_ENV={app}

# Tail logs
fly logs --app wolfy-keeper-sepolia

```
