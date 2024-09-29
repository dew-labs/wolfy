import {
    ProviderType,
    registerSatoruContractAddress,
    registerProvider,
    isSatoruContract,
} from "satoru-sdk";
import { getContracts, getNetAndChainId } from "./utils";

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
        if (address && isSatoruContract(contract))
            registerSatoruContractAddress(chainId, contract, address);
    });
}

export function setup() {
    registerContractAddresses();
    registerHttpProviders();
    registerWssProviders();
}
