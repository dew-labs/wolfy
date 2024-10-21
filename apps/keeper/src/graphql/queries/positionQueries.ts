import { gql } from "graphql-request";

export type OpenPositionsQueryResponse = {
    positions: {
        key: string;
    }[];
};

export const OPEN_POSITIONS_QUERY = gql`
    query OpenPositions($where: Position_filter) {
        positions(where: $where) {
            key
        }
    }
`;

export const OPEN_POSITIONS_QUERY_VARIABLES = {};
