import { findUpSync } from "find-up";
import readline from "node:readline";
import {
    Account,
    CallData,
    hash,
    json,
    type Abi,
    type BigNumberish,
    type CairoAssembly,
    type Calldata,
    type CompiledContract,
    type CompiledSierra,
    type RawArgs,
    type TypedContractV2,
} from "starknet";
import {
    createCall,
    createWolfyContract,
    executeAndWait,
    getProvider,
    OrderHandlerABI,
    OrderType,
    poseidonHash,
    ProviderType,
    WolfyContract,
    StarknetChainId,
    type Hashable,
    type WolfyContractAbi,
} from "wolfy-sdk";

import type { Contracts, Order, Token } from "@freyr/shared/interfaces";

import { createLogger } from "./logger";
import { setup } from "./setup";
import invariant from "tiny-invariant";
import { toStarknetHexString } from "wolfy-sdk";
import fs from "node:fs";
import { USD_DECIMALS } from "./config";

const logger = createLogger("Utils");

export function getCompiledSierraPath(contractName: string) {
    return `./target/release/freyr_${contractName}.contract_class.json`;
}

export function getCompiledCasmPath(contractName: string) {
    return `./target/release/freyr_${contractName}.compiled_contract_class.json`;
}

export function getCompiledSierra(contractPath: string) {
    return json.parse(
        fs.readFileSync(getCompiledSierraPath(contractPath)).toString("ascii")
    ) as CompiledSierra;
}

export function getCompiledCasm(contractPath: string) {
    return json.parse(
        fs.readFileSync(getCompiledCasmPath(contractPath)).toString("ascii")
    ) as CairoAssembly;
}

export function getClassHashFromSierra(compiledSierra: CompiledSierra) {
    return hash.computeSierraContractClassHash(compiledSierra);
}

export function getClassHash(path: string) {
    return toStarknetHexString(hash.computeSierraContractClassHash(getCompiledSierra(path)));
}

export function getClassHashFromCasm(compiledContract: CompiledContract | string) {
    return hash.computeContractClassHash(compiledContract);
}

export async function ensureDeployed(
    account: Account,
    contractAddress: string | undefined,
    contractPath: string,
    constructWith: RawArgs,
    additionInfo: true
): Promise<{
    address: string;
    classHash: string;
    abi: Abi;
}>;
export async function ensureDeployed(
    account: Account,
    contractAddress: string | undefined,
    contractPath: string,
    constructWith: RawArgs,
    additionInfo?: false
): Promise<{
    address: string;
}>;
export async function ensureDeployed(
    account: Account,
    contractAddress: string | undefined,
    contractPath: string,
    constructWith: RawArgs,
    additionInfo = false
): Promise<{
    address: string;
    classHash: string | undefined;
    abi: Abi | undefined;
}> {
    if (!contractAddress) {
        const compiledSierra = getCompiledSierra(contractPath);
        const compiledCasm = getCompiledCasm(contractPath);
        const callData: CallData = new CallData(compiledSierra.abi);
        const constructor: Calldata = callData.compile("constructor", constructWith);
        const deployResponse = await account.declareAndDeploy({
            contract: compiledSierra,
            casm: compiledCasm,
            constructorCalldata: constructor,
        });
        const deployReceipt = await account.waitForTransaction(
            deployResponse.deploy.transaction_hash
        );
        if (deployReceipt.isSuccess()) {
            console.log(`${contractPath}=${deployResponse.deploy.contract_address}`);

            return {
                abi: compiledSierra.abi,
                address: deployResponse.deploy.contract_address,
                classHash: deployResponse.deploy.classHash,
            };
        } else {
            throw new Error(`Failed to deploy ${contractPath}`);
        }
    } else {
        return {
            address: contractAddress,
            abi: additionInfo ? getCompiledSierra(contractPath).abi : undefined,
            classHash: additionInfo
                ? hash.computeSierraContractClassHash(getCompiledSierra(contractPath))
                : undefined,
        };
    }
}

export async function ensureDeclared(account: Account, contractPath: string): Promise<string> {
    const compiledCasm = getCompiledCasm(contractPath);
    const compiledSierra = getCompiledSierra(contractPath);
    try {
        const declareResponse = await account.declare({
            contract: compiledSierra,
            casm: compiledCasm,
        });
        const declareReceipt = await account.waitForTransaction(declareResponse.transaction_hash);
        if (declareReceipt.isSuccess()) {
            console.log(`${contractPath} declared.`);
        } else {
            throw new Error(`Failed to declare ${contractPath}.`);
        }
    } catch (error) {
        console.log(`${contractPath} already declared.`);
    }
    return getClassHashFromSierra(compiledSierra);
}

export function getNetAndChainId() {
    const net = process.env.NET!;

    const chainId = (function () {
        switch (net) {
            case "main":
                return StarknetChainId.SN_MAIN;
            case "sepolia":
                return StarknetChainId.SN_SEPOLIA;
            case "dev":
                return StarknetChainId.SN_SEPOLIA;
            case "dev-local":
                return StarknetChainId.SN_KATANA;
            default:
                return StarknetChainId.SN_SEPOLIA;
        }
    })();

    return { net, chainId };
}

export function getNetworkConfig() {
    const { net, chainId } = getNetAndChainId();

    const provider = getProvider(ProviderType.HTTP, chainId);

    const privateKey = process.env.ACCOUNT_PRIVATE;
    const accountAddress = process.env.ACCOUNT_PUBLIC;
    const hermesUrl = process.env.HERMES_URL;

    if (!privateKey || !accountAddress || !hermesUrl) {
        throw new Error(
            "Missing required environment variables: ACCOUNT_PRIVATE or ACCOUNT_PUBLIC or HERMES_URL"
        );
    }

    const account = new Account(provider, accountAddress, privateKey);

    return { net, chainId, account, hermesUrl };
}

export async function settingUp() {
    setup();

    const { net, chainId } = getNetAndChainId();

    const provider = getProvider(ProviderType.HTTP, chainId);

    if (
        !process.env.ACCOUNT_PRIVATE ||
        !process.env.ACCOUNT_PUBLIC ||
        !process.env.HERMES_URL ||
        !process.env.FEE_TOKEN
    )
        throw new Error("Missing required environment variables");

    // Connect to account
    const privateKey0: string = process.env.ACCOUNT_PRIVATE;
    const account0Address: string = process.env.ACCOUNT_PUBLIC;
    const account0 = new Account(provider, account0Address!, privateKey0!);

    logger.debug(
        `Interacting with Account: ${account0Address} via provider: ${provider.channel.nodeUrl}`
    );

    const resp = await account0.getSpecVersion();
    logger.debug(`rpc version = ${resp}`);

    return {
        net,
        chainId,
        account: account0,
        provider,
        hermesUrl: process.env.HERMES_URL,
        feeToken: process.env.FEE_TOKEN,
    };
}

export function getPragmaContract() {
    const net = process.env.NET;
    switch (net) {
        case "main":
            return "0x2a85bd616f912537c50a49a4076db02c00b29b2cdc8a197ce92ed1837fa875b";
        case "sepolia":
            return "0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a";
        default:
            throw new Error(`Unsupported network: ${net}`);
    }
}

export function getContracts(): Contracts {
    const net = process.env.NET;
    let contracts: Contracts = {};

    try {
        const contractsPath = findUpSync(`contracts.${net}.json`);
        if (!contractsPath) {
            throw new Error(`Contracts file not found for network: ${net}`);
        }
        contracts = JSON.parse(fs.readFileSync(contractsPath).toString("ascii"));
    } catch {}

    return contracts;
}

export function getTokens(): Token[] {
    const net = process.env.NET;
    let tokens: Token[] = [];
    try {
        const tokensPath = findUpSync(`tokens.${net}.json`);
        if (!tokensPath) {
            throw new Error(`Tokens file not found for network: ${net}`);
        }
        tokens = JSON.parse(fs.readFileSync(tokensPath).toString("ascii"));
    } catch {}

    return tokens;
}

export function createAsker() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    async function ask(question: string): Promise<string> {
        return new Promise((resolve) => {
            rl.question(`${question}: `, async (answer) => {
                resolve(answer);
            });
        });
    }

    function doneAsking() {
        rl.close();
    }

    return {
        ask,
        doneAsking,
    };
}

export function expandDecimals(value: BigNumberish, decimals: number | bigint): bigint {
    if (!value) return 0n;

    if (typeof value === "number") return BigInt(value.toFixed(Number(decimals)).replace(".", ""));
    if (typeof value === "bigint") return value * 10n ** BigInt(decimals);

    const valueString = value.replace(/[^0-9.]/g, "");

    const dotIndex = valueString.indexOf(".");

    const decimalPart = (dotIndex !== -1 ? valueString.slice(dotIndex + 1) : "")
        .padEnd(Number(decimals), "0")
        .slice(0, Number(decimals));

    const integerPart = dotIndex !== -1 ? valueString.slice(0, dotIndex) : valueString;

    return BigInt(integerPart + decimalPart);
}

export function shrinkDecimals(
    value: BigNumberish,
    decimals: number | bigint,
    fractionPlaces?: number | bigint,
    exactFractionPlaces = false
): string {
    decimals = Number(decimals);
    let display = (() => {
        if (typeof value === "number") return value.toFixed(0);
        if (typeof value === "string") return parseInt(value).toFixed(0);
        return String(value);
    })();

    const negative = display.startsWith("-");
    if (negative) display = display.slice(1);

    display = display.padStart(decimals, "0");

    const integer = display.slice(0, display.length - decimals);
    let fraction = display.slice(display.length - decimals);
    fraction = fraction.replace(/0+$/, "");
    if (fractionPlaces) fraction = fraction.slice(0, Number(fractionPlaces));
    if (fractionPlaces && exactFractionPlaces)
        fraction = fraction.padEnd(Number(fractionPlaces), "0");
    return `${negative ? "-" : ""}${integer || "0"}${fraction ? "." + fraction : ""}`;
}

export function decimalToFloat(value: BigNumberish, decimals = 0) {
    return expandDecimals(value, USD_DECIMALS - decimals);
}

// export const MAX_UINT8 = 255n; // 2^8 - 1
// export const MAX_UINT32 = 4294967295n; // 2^32 - 1
// export const MAX_UINT64 = 18446744073709551615n; // 2^64 - 1

// function getCompactedValues({
//     values,
//     compactedValueBitLength,
//     maxValue,
// }: {
//     values: bigint[];
//     compactedValueBitLength: number;
//     maxValue: bigint;
// }) {
//     const compactedValuesPerSlot = 256 / compactedValueBitLength;
//     const compactedValues = [];
//     let shouldExit = false;

//     for (let i = 0; i < Math.floor((values.length - 1) / compactedValuesPerSlot) + 1; i++) {
//         let valueBits = 0n;
//         for (let j = 0; j < compactedValuesPerSlot; j++) {
//             const index = i * compactedValuesPerSlot + j;
//             if (index >= values.length) {
//                 shouldExit = true;
//                 break;
//             }

//             const value = values[index];
//             if (!value && value !== 0n) throw new Error(`Value index out of range: ${index}`);

//             if (value > maxValue) {
//                 throw new Error(`Max value exceeded: ${value}`);
//             }

//             valueBits = valueBits | (value << BigInt(j * compactedValueBitLength));
//         }

//         compactedValues.push(valueBits);

//         if (shouldExit) {
//             break;
//         }
//     }

//     return compactedValues;
// }

// export function getCompactedPrices(prices: bigint[]) {
//     return getCompactedValues({
//         values: prices,
//         compactedValueBitLength: 32,
//         maxValue: MAX_UINT32,
//     });
// }

// export function getCompactedPriceIndexes(priceIndexes: bigint[]) {
//     return getCompactedValues({
//         values: priceIndexes,
//         compactedValueBitLength: 8,
//         maxValue: MAX_UINT8,
//     });
// }

// export function getCompactedDecimals(decimals: bigint[]) {
//     return getCompactedValues({
//         values: decimals,
//         compactedValueBitLength: 8,
//         maxValue: MAX_UINT8,
//     });
// }

// export function getCompactedOracleBlockNumbers(blockNumbers: bigint[]) {
//     return getCompactedValues({
//         values: blockNumbers,
//         compactedValueBitLength: 64,
//         maxValue: MAX_UINT64,
//     });
// }

// export function getCompactedOracleTimestamps(timestamps: bigint[]) {
//     return getCompactedValues({
//         values: timestamps,
//         compactedValueBitLength: 64,
//         maxValue: MAX_UINT64,
//     });
// }

export async function getSetPriceParams(account: Account, tokensWithPrices: [string, bigint][]) {
    const currentBlockNum = await account.getBlockNumber();
    const currentBlock = await account.getBlock();
    const block0 = BigInt(currentBlockNum);
    const block1 = BigInt(currentBlockNum + 1);

    const blocks0 = tokensWithPrices.map(() => block0);
    const blocks1 = tokensWithPrices.map(() => block1);
    const tokens = tokensWithPrices.map(([tokenAddress]) => tokenAddress);
    const prices = tokensWithPrices.map(([, price]) => price);
    const notInUse = tokensWithPrices.map(() => 0n);
    const signatures = tokensWithPrices.map(() => ["signatures1", "signatures2"]);

    return {
        compacted_min_oracle_block_numbers: blocks0,
        compacted_max_oracle_block_numbers: blocks1,
        compacted_oracle_timestamps: [currentBlock.timestamp], // not in use
        tokens: tokens,
        compacted_decimals: notInUse, // decimals of the price, not in use
        compacted_min_prices_indexes: notInUse, // not in use
        compacted_max_prices_indexes: notInUse, // not in use
        compacted_min_prices: prices, // doesn't matter
        compacted_max_prices: prices, // this is the price where order executed
        signer_info: 1,
        signatures: signatures,
        price_feed_tokens: [],
    };
}

export async function executeOrder(
    order: Order,
    indexTokenAddress: string,
    longTokenAddress: string,
    shortTokenAddress: string,
    executionIndexPrice: bigint,
    executionLongPrice: bigint,
    executionShortPrice: bigint
): Promise<void> {
    const { account, chainId } = getNetworkConfig();
    const priceParams = await getSetPriceParams(account, [
        [indexTokenAddress, executionIndexPrice],
        [longTokenAddress, executionLongPrice],
        [shortTokenAddress, executionShortPrice],
    ]);

    const orderHandlerContract: TypedContractV2<WolfyContractAbi<WolfyContract.OrderHandler>> =
        createWolfyContract(chainId, WolfyContract.OrderHandler, OrderHandlerABI, account);

    logger.info(
        `Order ${order.key} [${order.orderType}]: Executing with price: ${executionIndexPrice} (acceptable: ${order.acceptablePrice})`
    );

    const executeOrderReceipt = await executeAndWait(
        account,
        createCall(orderHandlerContract, "execute_order", [order.key, priceParams])
    );

    if (executeOrderReceipt.isSuccess()) {
        logger.debug(
            `${order.orderType} Order ${order.key}: Transaction key ${executeOrderReceipt.transaction_hash}`
        );
    }
}

export const measureExecutionTime = async <T>(
    fn: () => Promise<T>,
    logMessage: string
): Promise<T> => {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    logger.debug(`${logMessage} (in ${executionTime.toFixed(2)} ms)`);
    return result;
};

export const isMarketOrder = (orderType: OrderType): boolean =>
    [OrderType.MarketDecrease, OrderType.MarketIncrease, OrderType.MarketSwap].includes(orderType);

export const isLiquidationOrder = (orderType: OrderType): boolean =>
    orderType === OrderType.Liquidation;

export const hashPositionKey = (
    account: Hashable,
    market: Hashable,
    collateralToken: Hashable,
    isLong: boolean
) => {
    return poseidonHash([account, market, collateralToken, isLong]);
};

export const getEnvVariable = (name: string): string => {
    const value = process.env[name];
    invariant(value, `${name} environment variable required`);

    return value;
};

export function getContractNames(type: "casm" | "sierra" = "sierra") {
    const PROJECT_NAME = "freyr";
    return fs
        .readdirSync("./target/release", { withFileTypes: true })
        .filter(
            (file) =>
                file.isFile() &&
                file.name.endsWith(`.${type === "casm" ? "compiled_" : ""}contract_class.json`) &&
                !file.name.startsWith(`${PROJECT_NAME}_tests`) &&
                !file.name.startsWith(`${PROJECT_NAME}_unittest`)
        )
        .map((file) =>
            file.name.replace(PROJECT_NAME + "_", "").replace(".contract_class.json", "")
        );
}
