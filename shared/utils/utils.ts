import {
    Account,
    CallData,
    hash,
    json,
    shortString,
    type Abi,
    type Calldata,
    type RawArgs,
    type CompiledSierra,
    type CairoAssembly,
    type CompiledContract,
    ec,
    num,
    type BigNumberish,
    type TypedContractV2,
} from "starknet";
import fs from "node:fs";
import {
    createCall,
    createSatoruContract,
    executeAndWait,
    getProvider,
    OrderHandlerABI,
    ProviderType,
    SatoruContract,
    StarknetChainId,
    toStarknetHexString,
    type SatoruContractAbi,
} from "satoru-sdk";
import readline from "node:readline";
import setup from "./setup";
import type { Order } from "./../interfaces/Order";
import { getDataStoreContract } from "./helpers";
import { logger } from "./logger";
import { OrderPersistenceService } from "../../keeper/src/services/OrderPersistenceService";

export function getCompiledSierra(contractPath: string) {
    return json.parse(
        fs.readFileSync(`./target/dev/satoru_${contractPath}.contract_class.json`).toString("ascii")
    ) as CompiledSierra;
}

export function getCompiledCasm(contractPath: string) {
    return json.parse(
        fs
            .readFileSync(`./target/dev/satoru_${contractPath}.compiled_contract_class.json`)
            .toString("ascii")
    ) as CairoAssembly;
}

export function getClassHashFromSierra(compiledSierra: CompiledSierra) {
    return hash.computeSierraContractClassHash(compiledSierra);
}

export function getClassHash(path: string) {
    return hash.computeSierraContractClassHash(getCompiledSierra(path));
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
            default:
                return StarknetChainId.SN_SEPOLIA;
        }
    })();

    return { net, chainId };
}

export async function settingUp() {
    setup();

    const { net, chainId } = getNetAndChainId();

    const provider = getProvider(ProviderType.HTTP, chainId);

    // Connect to account
    const privateKey0: string = process.env.ACCOUNT_PRIVATE as string;
    const account0Address: string = process.env.ACCOUNT_PUBLIC as string;
    const account0 = new Account(provider, account0Address!, privateKey0!);

    console.log(
        `Interacting with Account: ${account0Address} via provider: ${provider.channel.nodeUrl}`
    );

    const resp = await account0.getSpecVersion();
    console.log("rpc version =", resp);

    return {
        net,
        chainId,
        account: account0,
        hermesUrl: process.env.HERMES_URL as string,
        feeToken: process.env.FEE_TOKEN as string,
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

export interface Contracts {
    RoleStore: string | undefined;
    DataStore: string | undefined;
    EventEmitter: string | undefined;
    OracleStore: string | undefined;
    Pragma: string | undefined;
    Oracle: string | undefined;
    OrderVault: string | undefined;
    SwapHandler: string | undefined;
    FeeHandler: string | undefined;
    ReferralStorage: string | undefined;
    IncreaseOrderUtils: string | undefined;
    DecreaseOrderUtils: string | undefined;
    SwapOrderUtils: string | undefined;
    OrderUtils: string | undefined;
    OrderHandler: string | undefined;
    DepositVault: string | undefined;
    DepositHandler: string | undefined;
    WithdrawalVault: string | undefined;
    WithdrawalHandler: string | undefined;
    LiquidationHandler: string | undefined;
    AdlHandler: string | undefined;
    MarketFactory: string | undefined;
    Reader: string | undefined;
    Router: string | undefined;
    ExchangeRouter: string | undefined;
}

export function getContracts(): Contracts {
    const net = process.env.NET;
    try {
        const contracts = JSON.parse(fs.readFileSync(`./contracts.${net}.json`).toString("ascii"));

        if (!contracts || typeof contracts !== "object") return {} as Contracts;
        return contracts as Contracts;
    } catch {
        return {} as Contracts;
    }
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

export type Hashable = string | bigint | boolean | number;

export function getKey(v: Hashable | Hashable[]) {
    const values = Array.isArray(v) ? v : [v];
    return ec.starkCurve.poseidonHashMany(
        values.map((value) => {
            if (typeof value === "boolean") return BigInt(value ? 1 : 0);
            if (typeof value === "string") {
                if (num.isHex(value)) return num.toBigInt(value);
                return BigInt(shortString.encodeShortString(value));
            }
            if (typeof value === "number") return BigInt(value);
            return value;
        })
    );
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

export function decimalToFloat(value: any, decimals = 0) {
    return expandDecimals(value, 30 - decimals);
}

export async function executeOrder(
    account: Account,
    order: Order,
    executionPrice: bigint
): Promise<void> {
    const { chainId } = getNetAndChainId();
    const dataStoreContract: TypedContractV2<SatoruContractAbi<SatoruContract.DataStore>> =
        getDataStoreContract(chainId, account);
    const market = await dataStoreContract.get_market(order.market);
    const indexTokenAddress: string = toStarknetHexString(market.index_token);
    const priceParams: any = await setPriceParams(account, indexTokenAddress, executionPrice);

    const orderHandlerContract: TypedContractV2<SatoruContractAbi<SatoruContract.OrderHandler>> =
        createSatoruContract(chainId, SatoruContract.OrderHandler, OrderHandlerABI, account);

    logger.info("Executing Order ... 💨");

    const executeOrderReceipt = await executeAndWait(
        account,
        createCall(orderHandlerContract, "execute_order", [order.key, priceParams])
    );

    if (executeOrderReceipt.isSuccess()) {
        logger.success("Execute Successfully 🚀");
        logger.success(`== with Transaction Hash: ${executeOrderReceipt.transaction_hash}`);

        const orderPersistenceService = new OrderPersistenceService();
        orderPersistenceService.deleteOrder(order.key, indexTokenAddress);
    } else {
        // TODO: retry here
    }
}

export async function setPriceParams(
    account: Account,
    indexTokenAddress: string,
    executionPrice: bigint
): Promise<any> {
    const currentBlockNum = await account.getBlockNumber();
    const currentBlock = await account.getBlock();
    const block0 = 0;
    const block1 = currentBlockNum;

    return {
        signer_info: 1,
        tokens: [indexTokenAddress],
        compacted_min_oracle_block_numbers: [block0, block0],
        compacted_max_oracle_block_numbers: [block1, block1],
        compacted_oracle_timestamps: [currentBlock.timestamp, currentBlock.timestamp], // not in use
        compacted_decimals: [0, 0], // decimals of the price, not in use
        compacted_min_prices_indexes: [0], // not in use
        compacted_max_prices_indexes: [0], // not in use
        compacted_min_prices: [2147483648010000], // doesn't matter
        compacted_max_prices: [executionPrice], // this is the price where order executed
        signatures: [
            ["signatures1", "signatures2"],
            ["signatures1", "signatures2"],
        ],
        price_feed_tokens: [],
    };
}
