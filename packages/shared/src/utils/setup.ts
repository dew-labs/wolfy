import {
    ProviderType,
    registerSatoruContractAddress,
    registerProvider,
    isSatoruContract,
} from "satoru-sdk";
import { getContracts, getNetAndChainId } from "./utils";

function registerHttpProviders() {
    const { chainId } = getNetAndChainId();
    const providerUrls = process.env.KEEPER_HTTP_PROVIDER_URLS;

    if (!providerUrls) throw new Error("Missing KEEPER_HTTP_PROVIDER_URLS environment variable");

    providerUrls.split(",").forEach((url) => {
        registerProvider(ProviderType.HTTP, chainId, url);
    });
}

function registerWssProviders() {
    const { chainId } = getNetAndChainId();
    const providerUrl = process.env.KEEPER_WSS_PROVIDER_URL;
    if (!providerUrl) throw new Error("Missing KEEPER_WSS_PROVIDER_URL environment variable");
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
