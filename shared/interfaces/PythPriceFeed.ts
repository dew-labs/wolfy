export interface PythPriceFeed {
    id: string;
    price: PythPrice;
    ema_price: PythPrice;
    metadata: PythPriceFeedMetadata;
}

interface PythPrice {
    price: string;
    conf: string;
    expo: number;
    publish_time: number;
}

interface PythPriceFeedMetadata {
    slot: number;
    proof_available_time: number;
    prev_publish_time: number;
}
