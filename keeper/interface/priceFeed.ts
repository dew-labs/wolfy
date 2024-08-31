export interface IPriceFeed {
    id: string;
    price: IPrice;
    ema_price: IPrice;
    metadata: IPriceFeedMetadata;
}

interface IPrice {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
}

interface IPriceFeedMetadata {
    slot: number;
    proof_available_time: number;
    prev_publish_time: number;
}
