import { json } from "starknet";
import fs from "node:fs";

const CONTRACTS = [
    ["RoleStore", "./target/dev/satoru_RoleStore.contract_class.json"],
    ["DataStore", "./target/dev/satoru_DataStore.contract_class.json"],
    ["EventEmitter", "./target/dev/satoru_EventEmitter.contract_class.json"],
    ["OracleStore", "./target/dev/satoru_OracleStore.contract_class.json"],
    ["Oracle", "./target/dev/satoru_Oracle.contract_class.json"],
    ["OrderVault", "./target/dev/satoru_OrderVault.contract_class.json"],
    ["IncreaseOrderUtils", "./target/dev/satoru_IncreaseOrderUtils.contract_class.json"],
    ["DecreaseOrderUtils", "./target/dev/satoru_DecreaseOrderUtils.contract_class.json"],
    ["SwapOrderUtils", "./target/dev/satoru_SwapOrderUtils.contract_class.json"],
    ["OrderUtils", "./target/dev/satoru_OrderUtils.contract_class.json"],
    ["OrderHandler", "./target/dev/satoru_OrderHandler.contract_class.json"],
    ["DepositVault", "./target/dev/satoru_DepositVault.contract_class.json"],
    ["DepositHandler", "./target/dev/satoru_DepositHandler.contract_class.json"],
    ["WithdrawalVault", "./target/dev/satoru_WithdrawalVault.contract_class.json"],
    ["WithdrawalHandler", "./target/dev/satoru_WithdrawalHandler.contract_class.json"],
    ["LiquidationHandler", "./target/dev/satoru_LiquidationHandler.contract_class.json"],
    ["AdlHandler", "./target/dev/satoru_AdlHandler.contract_class.json"],
    ["MarketFactory", "./target/dev/satoru_MarketFactory.contract_class.json"],
    ["Reader", "./target/dev/satoru_Reader.contract_class.json"],
    ["Router", "./target/dev/satoru_Router.contract_class.json"],
    ["ExchangeRouter", "./target/dev/satoru_ExchangeRouter.contract_class.json"],
    ["ReferralStorage", "./target/dev/satoru_ReferralStorage.contract_class.json"],
    ["ERC20", "./target/dev/satoru_ERC20.contract_class.json"],
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
