import { type Order } from "../interfaces";
import { getTokens } from "./utils";

const tokens = getTokens();
let tokenAddressToOrdersMap: Record<string, Order[]> = tokens.reduce((acc, token) => {
    acc[token.address] = [];
    return acc;
}, {} as Record<string, Order[]>);

export const setTokenAddressToOrdersMap = (data: Record<string, Order[]>) => {
    tokenAddressToOrdersMap = data;
};

export const getTokenAddressToOrdersMap = () => {
    return tokenAddressToOrdersMap;
};
