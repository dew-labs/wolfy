# Wolfy Backend

Wolfy backend is a backend service designed to expose api for various data like trading history, analytics ,...

## Local Environment Setup

### Setup steps

```bash
git clone https://github.com/dew-labs/satoru.git
cd satoru/apps/backend
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
