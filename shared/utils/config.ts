export const USD_DECIMALS = 30;

export enum EventHandlerTypes {
    orderCreated = "orderCreated",
    positionIncrease = "positionIncrease",
    positionDecrease = "positionDecrease",
    oraclePriceUpdated = "oraclePriceUpdated",
    executeLimitOrdersIfExecutable = "executeLimitOrdersIfExecutable",
}
