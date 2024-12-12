import fs from "node:fs";
import { getContracts } from "@freyr/shared/utils";
import { LogLevel, type CheckpointConfig } from "@snapshot-labs/checkpoint";
import { EventEmitterABI, WolfyEvent } from "wolfy-sdk";
import { setup } from "@freyr/shared/utils";
import {
    handleOrderCreated,
    handleOrderExecuted,
    handleOrderCancelled,
    handlePositionDecrease,
    handlePositionIncrease,
    handleDepositExecuted,
    handleDepositCreated,
    handleDepositCancelled,
    handleWithdrawalExecuted,
    handleWithdrawalCreated,
    handleWithdrawalCancelled,
    handleMarketCreated,
} from "./writers";

export const getConfig = () => {
    setup();

    const networkNodeUrl = process.env.INDEXER_PROVIDER_URL;

    if (!networkNodeUrl) {
        throw new Error("Missing required environment variables: INDEXER_PROVIDER_URL");
    }

    const contracts = getContracts();
    const eventEmitterAddress = contracts.EventEmitter;
    if (!eventEmitterAddress) {
        throw new Error("Missing required contracts: EventEmitter");
    }

    const events = [
        {
            name: WolfyEvent.MarketCreated,
            fn: handleMarketCreated.name,
        },
        {
            name: WolfyEvent.OrderCreated,
            fn: handleOrderCreated.name,
        },
        {
            name: WolfyEvent.OrderExecuted,
            fn: handleOrderExecuted.name,
        },
        {
            name: WolfyEvent.OrderCancelled,
            fn: handleOrderCancelled.name,
        },
        {
            name: WolfyEvent.PositionIncrease,
            fn: handlePositionIncrease.name,
        },
        {
            name: WolfyEvent.PositionDecrease,
            fn: handlePositionDecrease.name,
        },
        {
            name: WolfyEvent.DepositCreated,
            fn: handleDepositCreated.name,
        },
        {
            name: WolfyEvent.DepositExecuted,
            fn: handleDepositExecuted.name,
        },
        {
            name: WolfyEvent.DepositCancelled,
            fn: handleDepositCancelled.name,
        },
        {
            name: WolfyEvent.WithdrawalCreated,
            fn: handleWithdrawalCreated.name,
        },
        {
            name: WolfyEvent.WithdrawalExecuted,
            fn: handleWithdrawalExecuted.name,
        },
        {
            name: WolfyEvent.WithdrawalCancelled,
            fn: handleWithdrawalCancelled.name,
        },
    ];

    const config: CheckpointConfig = {
        network_node_url: networkNodeUrl,
        sources: [
            {
                contract: eventEmitterAddress,
                start: 0,
                abi: "EventEmitterABI",
                events,
            },
        ],
        decimal_types: {
            Int256: {
                p: 78,
                d: 0,
            },
        },
    };

    fs.writeFileSync("src/config.json", JSON.stringify(config, null, 2));

    return config;
};

export const options = {
    logLevel: LogLevel.Info,
    prettifyLogs: true,
    fetchInterval: 15000,
    resetOnConfigChange: true,
    abis: {
        EventEmitterABI,
    },
};
