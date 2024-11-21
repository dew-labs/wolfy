import { json } from "starknet";
import fs from "node:fs";

const PROJECT_NAME = "freyr";

const CONTRACTS = [
    ["RoleStore", `./target/release/${PROJECT_NAME}_RoleStore.contract_class.json`],
    ["DataStore", `./target/release/${PROJECT_NAME}_DataStore.contract_class.json`],
    ["EventEmitter", `./target/release/${PROJECT_NAME}_EventEmitter.contract_class.json`],
    ["OracleStore", `./target/release/${PROJECT_NAME}_OracleStore.contract_class.json`],
    ["Oracle", `./target/release/${PROJECT_NAME}_Oracle.contract_class.json`],
    ["OrderVault", `./target/release/${PROJECT_NAME}_OrderVault.contract_class.json`],
    [
        "IncreaseOrderUtils",
        `./target/release/${PROJECT_NAME}_IncreaseOrderUtils.contract_class.json`,
    ],
    [
        "DecreaseOrderUtils",
        `./target/release/${PROJECT_NAME}_DecreaseOrderUtils.contract_class.json`,
    ],
    ["SwapOrderUtils", `./target/release/${PROJECT_NAME}_SwapOrderUtils.contract_class.json`],
    ["OrderUtils", `./target/release/${PROJECT_NAME}_OrderUtils.contract_class.json`],
    ["OrderHandler", `./target/release/${PROJECT_NAME}_OrderHandler.contract_class.json`],
    ["DepositVault", `./target/release/${PROJECT_NAME}_DepositVault.contract_class.json`],
    ["DepositHandler", `./target/release/${PROJECT_NAME}_DepositHandler.contract_class.json`],
    ["WithdrawalVault", `./target/release/${PROJECT_NAME}_WithdrawalVault.contract_class.json`],
    ["WithdrawalHandler", `./target/release/${PROJECT_NAME}_WithdrawalHandler.contract_class.json`],
    [
        "LiquidationHandler",
        `./target/release/${PROJECT_NAME}_LiquidationHandler.contract_class.json`,
    ],
    ["AdlHandler", `./target/release/${PROJECT_NAME}_AdlHandler.contract_class.json`],
    ["FeeHandler", `./target/release/${PROJECT_NAME}_FeeHandler.contract_class.json`],
    ["SwapHandler", `./target/release/${PROJECT_NAME}_SwapHandler.contract_class.json`],
    ["MarketFactory", `./target/release/${PROJECT_NAME}_MarketFactory.contract_class.json`],
    ["Reader", `./target/release/${PROJECT_NAME}_Reader.contract_class.json`],
    ["Router", `./target/release/${PROJECT_NAME}_Router.contract_class.json`],
    ["ExchangeRouter", `./target/release/${PROJECT_NAME}_ExchangeRouter.contract_class.json`],
    ["ReferralStorage", `./target/release/${PROJECT_NAME}_ReferralStorage.contract_class.json`],
    ["ERC20", `./target/release/${PROJECT_NAME}_ERC20.contract_class.json`],
] as const;

function genAbis() {
    CONTRACTS.forEach(([name, path]) => {
        const compiledSierra = json.parse(fs.readFileSync(path).toString("ascii"));
        const abiContent = JSON.stringify(compiledSierra.abi);
        fs.writeFileSync(`${__dirname}/../../artifacts/${name}Abi.json`, abiContent, { flag: "w" });
        const tsContent = `const ${name}ABI=${abiContent} as const;export default ${name}ABI`;
        fs.writeFileSync(`${__dirname}/../../artifacts/${name}ABI.ts`, tsContent, {
            flag: "w",
        });
    });
}

genAbis();
