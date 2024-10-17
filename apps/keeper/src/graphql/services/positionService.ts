import { createLogger } from "@freyr/shared/utils";

import { client } from "../client";
import {
    OPEN_POSITIONS_QUERY,
    OPEN_POSITIONS_QUERY_VARIABLES,
    type OpenPositionsQueryResponse,
} from "../queries/positionQueries";

const logger = createLogger("OrderService");

export const fetchOpenPositionKeys = async () => {
    try {
        // TODO: use typebox to validate the response
        const response = await client.request<OpenPositionsQueryResponse>(
            OPEN_POSITIONS_QUERY,
            OPEN_POSITIONS_QUERY_VARIABLES
        );

        const positionKeys = response.positions.map((position) => position.key);
        return positionKeys;
    } catch (error) {
        logger.error("Error fetching open positions:", error);
        return [];
    }
};
