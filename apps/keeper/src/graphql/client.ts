import { GraphQLClient } from "graphql-request";

const endpoint = process.env.INDEXER_URL;

if (!endpoint) {
    throw new Error("INDEXER_URL is not set");
}

export const client = new GraphQLClient(endpoint, {});
