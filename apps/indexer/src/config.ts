import { getContracts } from "@freyr/shared/utils";
import { LogLevel, type CheckpointConfig } from "@snapshot-labs/checkpoint";
import { EventEmitterABI } from "satoru-sdk";
import { setup } from "@freyr/shared/utils";

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
            name: "OrderCreated",
            fn: "handleOrderCreated",
        },
        {
            name: "OrderExecuted",
            fn: "handleOrderExecuted",
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
