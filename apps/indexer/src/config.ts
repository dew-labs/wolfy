import { getContracts } from "@freyr/shared/utils";
import { LogLevel } from "@snapshot-labs/checkpoint";
import { EventEmitterABI } from "satoru-sdk";
import fs from "node:fs";
import { setup } from "@freyr/shared/utils";

const getConfig = () => {
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

    const config = {
        network_node_url: networkNodeUrl,
        sources: [
            {
                contract: eventEmitterAddress,
                start: 0,
                abi: "EventEmitterABI",
                events,
            },
        ],
    };

    fs.writeFileSync("./src/config.json", JSON.stringify(config, null, 2));

    return config;
};

export const config = getConfig();
export const options = {
    logLevel: LogLevel.Info,
    prettifyLogs: true,
    fetchInterval: 15000,
    resetOnConfigChange: true,
    abis: {
        EventEmitterABI,
    },
};
