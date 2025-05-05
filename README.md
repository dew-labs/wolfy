# Wolfy Trade

## Development

Requirement:

- mise `brew install mise`, remember to follow brew instructions to add `mise` to PATH
- rustup `brew install rustup`, remember to follow brew instructions to add `rustup` to PATH

IDE Integration:

- VSCode: [Cairo 1.0](https://marketplace.visualstudio.com/items?itemName=starkware.cairo1)

```sh
mise trust
mise plugins install https://github.com/dojoengine/asdf-dojo
mise install # to install scarb, starknet-foundry, bun, dojo
bun install
rustup install stable
rustup default stable # to set rust to stable version, required to run scarb
cargo install universal-sierra-compiler --git https://github.com/software-mansion/universal-sierra-compiler
```

## Test contracts

```sh
scarb lint --fix --test
scarb --dev test
scarb --dev test -e <full-test-name> # run a specific test without compile another tests
scarb --dev test --rerun-failed # rerun only failed tests
scarb --dev test --ignored # run only ignored
scarb --dev test --include-ignored # run all tests including ignored

# Debug, backtrace
SNFORGE_BACKTRACE=1 scarb -P verbose test

# Coverage https://foundry-rs.github.io/starknet-foundry/testing/coverage.html
scarb --dev test --coverage # run tests and generate coverage report

# Profiling https://foundry-rs.github.io/starknet-foundry/snforge-advanced-features/profiling.html
scarb --dev test --save-trace-data
scarb --dev test --build-profile
```

This will execute the tests in `tests` directory and print the results.

## Running with katana devnet

Run the following command and use the output information to update `.env.dev-local`:

```sh
katana --db-dir ./katana-db
mitmdump -s cors_interceptor.py --mode reverse:http://127.0.0.1:5050
```

Original katana server will run on <http://127.0.0.1:5050>
MITM server will run on <https://127.0.0.1:8080> to support cors and https/ssl/tls connection

Bootstrapping:

```sh
bun run dev-local:misc:deploy:multicall # Deploy multicall contract
bun run dev-local:misc:deploy:account # Deploy Argent account contract
bun run dev-local:action:bulk:deploy-tokens # Deploy all tokens
```

To use dev-local with browser wallets like `Argent X`, remember to config the wallet network properly with:

- `Chain ID`
- `RPC URL`
- `Account class hash`
- `Fee Token Address`
- `Multicall Address`

## Build

```sh
scarb --release build
```

This will build the smart contracts into `target` directory.

## Deploy

Setup a starknet account: [Guide](https://docs.starknet.io/quick-start/set-up-an-account/)
Prepare `.env.<PROFILE>` based on `.env.example`

```sh
bun run <PROFILE>:deploy
```

## Prove

```sh
scarb execute
scarb prove --execution_id=1
scarb verify <path_to_proof_json>
```

## Troubleshooting

```sh
scarb clean-cache
```

## Deployed Contracts

Please see `contracts.<PROFILE>.json`
