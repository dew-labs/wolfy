# Satoru

## Development

Requirement:

- Scarb 2.6.0
- Starknet Foundry 0.27.0
- NodeJS 20.15.0

IDE Integration:

- VSCocde: [Cairo 1.0](https://marketplace.visualstudio.com/items?itemName=starkware.cairo1)

```sh
pnpm install
```

## Test

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
Prepare `.env` based on `.env.example`

```sh
pnpm deploy-app
pnpm deploy-app > output.txt
```

## Deployed Contracts

```text
Deploying with Account: 0x0746CA2519Aaa863327f7D0147590c2e0f949feD3D61f2A160c356A7332cAE26
rpc version = 0.7.1
RoleStore Deployed: 0x775ec38451afc1128f08c00b9c8a2cb04c7edece09bd427675436b606cf1acb
DataStore Deployed: 0x4291d77e45794358c40f18e018d5744ee6cbe6bf044a9a3e06a7b1804b5c75b
Controller role granted.
EventEmitter Deployed: 0x9f57c907833e2fa417b403ea82b352b5d931433bd1ba2c6ed47cc846d3cd8e
OracleStore Deployed: 0x4d8f879b545600c641d37b8a29808b4d8644ec064bcab7ebf68469945ca4a97
Oracle Deployed: 0x23eedee65385a5b5942f80abcd39e2a20efd0a640cd9c5b8865ea758c1e23c3
OrderVault Deployed: 0x6856f14864e78705689f80333be17dd01d0b96f9f24e8f6f272f4eef5635ee
SwapHandler Deployed: 0x5a81bc77b363ebf223cf8f6f457ea0379dccff355ad062649cea4be27ac8541
ReferralStorage Deployed: 0x477fb0461b2a3b85f5b5da0c4c0a807c37e4cf1292daff42372ae9a3a99c619
IncreaseOrderUtils Deployed: 0x190dbf16c78e04f6afe36559359b4b44080ea45492051d63abe03b8ba94927b
IncreaseOrderUtils Class Hash: 0x7a6faba36550c741addae9b1d8a1cc64c2996c2f6fd968ee43d71d6e8edf59f
DecreaseOrderUtils Deployed: 0x11c0d11ac8485073000fa7959fdb884b6642c3ede94c22cc0c695e538e7b8ba
DecreaseOrderUtils Class Hash: 0x4f3edcc65b17e0ed9dee1d96d1ea0502583378ec533f0d3ad16de4ab8dcf614
SwapOrderUtils Deployed: 0x380e5673a75c5aa9024e8c043cf8235c789828434a70c5970cd084226ea59f9
SwapOrderUtils Class Hash: 0x28eac1baa8ac8a0251cf03b7d4cfa88def15f09bb298b7f0a47f7d4c9883a86
OrderUtils Deployed: 0xe6408a562f3f6887275eae07a8ff4ab992a9a5ad55c845a12c2f2e94f09106
OrderUtils Class Hash: 0x44ea74f01dcc11697bfcc713226c907b452e29462889ccc959eedc380c874ff
OrderHandler Deployed: 0x54d158d6174a14a4e669c3fd366abb540e4a27d6f647db43b5ebf009f41a3ad
DepositVault Deployed: 0x5a59b8fb8fecee4e7999ce5a7687781d89f5562a81cf2fe27c01927803d26ed
DepositHandler Deployed: 0x310042cbdd91a9ee89a9d514786fe4be4fd66b818b0028488fe3e4027e84148
WithdrawalVault Deployed: 0x7dd31d885215cae43fd2f06e06c6512777c1ca01dee243de08b9fd04438a1fb
WithdrawalHandler Deployed: 0x7333a3d5acfb6b512303daf271c3b15e1fc41ba4cdc3d1eacee5dec279c75c5
MarketToken Already Declared.
MarketFactory Deployed: 0x6b7accc3cb58d05c0995bc600733989ab7541a06d150ced8c1daef1428add2e
Reader Deployed: 0x772dbaa8c849bcd4ec161fdb270f133ae0511617252f3efb0cd92d77288ee2c
Router Deployed: 0x7d1cf207b8752e9546c4192187cfb011ee819065b3f20ff905d8dd01ea4b6a4
ExchangeRouter Deployed: 0x34182469b588cc97773a3dad8073381bca527deb061255391ff485ebd32a2c6
Roles granted.
```
