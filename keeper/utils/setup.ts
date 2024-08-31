import {
    ProviderType,
    registerSatoruContractAddress,
    registerProvider,
    SatoruContract,
    StarknetChainId,
    getProvider,
} from "satoru-sdk";
import fs from "node:fs";
import type { Contracts } from "keeper/src/interfaces/Contracts";
import { Account } from "starknet";
import { logger } from "./logger";

function registerHttpProviders() {
    const { chainId } = getNetAndChainId();
    const providerUrl = process.env.PROVIDER_URL;

    if (!providerUrl) throw new Error("Missing PROVIDER_URL environment variable");

    registerProvider(ProviderType.HTTP, chainId, providerUrl);
}

function registerWssProviders() {
    const { chainId } = getNetAndChainId();
    const providerUrl = process.env.WSS_PROVIDER_URL;
    if (!providerUrl) throw new Error("Missing WSS_PROVIDER_URL environment variable");
    registerProvider(ProviderType.WSS, chainId, providerUrl);
}

function registerContractAddresses() {
    const contracts = getContracts();
    const { chainId } = getNetAndChainId();

    Object.entries(contracts).forEach(([contract, address]) => {
        registerSatoruContractAddress(
            chainId as StarknetChainId,
            contract as unknown as SatoruContract,
            address
        );
    });
}

function getNetAndChainId() {
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

function getContracts(): Contracts {
    const net = process.env.NET;
    try {
        const contracts = JSON.parse(fs.readFileSync(`./contracts.${net}.json`).toString("ascii"));

        if (!contracts || typeof contracts !== "object") return {} as Contracts;
        return contracts as Contracts;
    } catch {
        return {} as Contracts;
    }
}

export default async function setup() {
    registerContractAddresses();
    registerHttpProviders();
    registerWssProviders();

    const { net, chainId } = getNetAndChainId();

    const provider = getProvider(ProviderType.HTTP, chainId);

    // Connect to account
    const privateKey0: string = process.env.ACCOUNT_PRIVATE as string;
    const account0Address: string = process.env.ACCOUNT_PUBLIC as string;
    const account0 = new Account(provider, account0Address!, privateKey0!);

    logger.info(
        `Interacting with Account: ${account0Address} via provider: ${provider.channel.nodeUrl}`
    );

    const resp = await account0.getSpecVersion();
    logger.info(`rpc version = ${resp}`);

    return {
        net,
        chainId,
        account: account0,
        hermesUrl: process.env.HERMES_URL as string,
        feeToken: process.env.FEE_TOKEN as string,
    };
}
