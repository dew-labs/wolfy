# Satoru

## Development

Requirement:

- mise `brew install mise`, remember to follow brew instructions to add `mise` to PATH
- rustup `brew install rustup`, remember to follow brew instructions to add `rustup` to PATH


IDE Integration:

- VSCocde: [Cairo 1.0](https://marketplace.visualstudio.com/items?itemName=starkware.cairo1)


```sh
mise install # to install rust, scarb, starknet-foundry, bun
bun install
rustup default stable # to set rust to stable version, required to run scarb
```

## Test contracts

```sh
scarb test
scarb test --ignored
```

This will execute the tests in `tests` directory and print the results.

## Build

```sh
scarb build
```

This will build the smart contracts into `target` directory.

## Deploy

Setup a starknet account: [Guide](https://docs.starknet.io/quick-start/set-up-an-account/)
Prepare `.env.<PROFILE>` based on `.env.example`

```sh
bun run <PROFILE>:deploy
```

## Deployed Contracts

Please see `contracts.<PROFILE>.json`
