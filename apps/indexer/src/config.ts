import fs from "node:fs";
import { getContracts } from "@freyr/shared/utils";
import { LogLevel, type CheckpointConfig } from "@snapshot-labs/checkpoint";
import { EventEmitterABI, SatoruEvent } from "satoru-sdk";
import { setup } from "@freyr/shared/utils";
import {
    handleOrderCreated,
    handleOrderExecuted,
    handleOrderCancelled,
    handlePositionDecrease,
    handlePositionIncrease,
    handleDepositExecuted,
    handleDepositCreated,
    handleWithdrawalExecuted,
    handleWithdrawalCreated,
} from "./writers";

export const getConfig = () => {
    setup();

    const networkNodeUrl = process.env.PROVIDER_URL;

    if (!networkNodeUrl) {
        throw new Error("Missing required environment variables: PROVIDER_URL");
    }

    const contracts = getContracts();
    const eventEmitterAddress = contracts.EventEmitter;
    if (!eventEmitterAddress) {
        throw new Error("Missing required contracts: EventEmitter");
    }

    const events = [
        {
            name: SatoruEvent.OrderCreated,
            fn: handleOrderCreated.name,
        },
        {
            name: SatoruEvent.OrderExecuted,
            fn: handleOrderExecuted.name,
        },
        {
            name: SatoruEvent.OrderCancelled,
            fn: handleOrderCancelled.name,
        },
        {
            name: SatoruEvent.PositionIncrease,
            fn: handlePositionIncrease.name,
        },
        {
            name: SatoruEvent.PositionDecrease,
            fn: handlePositionDecrease.name,
        },
        {
            name: SatoruEvent.DepositCreated,
            fn: handleDepositCreated.name,
        },
        {
            name: SatoruEvent.DepositExecuted,
            fn: handleDepositExecuted.name,
        },
        {
            name: SatoruEvent.WithdrawalCreated,
            fn: handleWithdrawalCreated.name,
        },
        {
            name: SatoruEvent.WithdrawalExecuted,
            fn: handleWithdrawalExecuted.name,
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
            UInt256: {
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
