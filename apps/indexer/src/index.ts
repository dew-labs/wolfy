import fs from "node:fs";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import Checkpoint, { createGetLoader, starknet } from "@snapshot-labs/checkpoint";
import { config, options } from "./config";
import * as writers from "./writers/orderLimitWriter";
import { createLogger } from "@freyr/shared/utils";
import { StarknetIndexer } from "@snapshot-labs/checkpoint/dist/src/providers/starknet";

const logger = createLogger("Indexer");

const schema = fs.readFileSync(`${__dirname}/schema.gql`, "utf8");

const createIndexer = () => new starknet.StarknetIndexer(writers);
const createCheckpoint = (indexer: StarknetIndexer) =>
    new Checkpoint(config, indexer, schema, options);

const initializeCheckpoint = async (checkpoint: Checkpoint) => {
    await checkpoint.reset();
    await checkpoint.resetMetadata();
    await checkpoint.start();
};

const createApolloServer = (checkpoint: Checkpoint) =>
    new ApolloServer({
        schema: checkpoint.getSchema(),
    });

const startServer = async (server: ApolloServer, checkpoint: Checkpoint) => {
    await startStandaloneServer(server, {
        listen: { port: Number(process.env.INDEXER_PORT) || 3001 },
        context: async () => {
            const baseContext = checkpoint.getBaseContext();
            return {
                ...baseContext,
                getLoader: createGetLoader(baseContext),
            };
        },
    });

    logger.info("Indexer is running");
};

const main = async () => {
    if (process.env.CA_CERT) {
        process.env.CA_CERT = Buffer.from(process.env.CA_CERT, "base64").toString("utf-8");
    }
    logger.info(process.env.DATABASE_URL);
    logger.info(process.env.CA_CERT);
    const indexer = createIndexer();
    const checkpoint = createCheckpoint(indexer);

    try {
        initializeCheckpoint(checkpoint);
        const server = createApolloServer(checkpoint);
        await startServer(server, checkpoint);
    } catch (error) {
        logger.error(error, "Error running indexer");
    }
};

main();
