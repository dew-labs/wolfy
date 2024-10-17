import { type Order } from "../interfaces";
import { getTokens } from "./utils";

const tokens = getTokens();
let tokenAddressToOrdersMap: Record<string, Order[]> = tokens.reduce<Record<string, Order[]>>(
    (acc, token) => {
        acc[token.address] = [];
        return acc;
    },
    {}
);

export const setTokenAddressToOrdersMap = (data: Record<string, Order[]>) => {
    tokenAddressToOrdersMap = data;
};

export const getTokenAddressToOrdersMap = () => {
    return tokenAddressToOrdersMap;
};

let openPositionKeys: string[] = [];

export const setOpenPositionKeys = (data: string[]) => {
    openPositionKeys = data;
};

export const getOpenPositionKeys = () => {
    return openPositionKeys;
};
