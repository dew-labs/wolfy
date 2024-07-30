use pragma_lib::types::{DataType, PragmaPricesResponse};

#[starknet::interface]
trait IPriceFeed<TContractState> {
    fn get_data_median(self: @TContractState, data_type: DataType) -> PragmaPricesResponse;
}


// NOTE: mock for testing.
#[starknet::contract]
mod PriceFeed {
    use pragma_lib::types::{DataType, PragmaPricesResponse};

    #[storage]
    struct Storage {}

    #[abi(embed_v0)]
    impl PriceFeedImpl of super::IPriceFeed<ContractState> {
        fn get_data_median(self: @ContractState, data_type: DataType) -> PragmaPricesResponse {
            PragmaPricesResponse {
                price: 1700,
                decimals: 18,
                last_updated_timestamp: 0,
                num_sources_aggregated: 5,
                expiration_timestamp: Option::None,
            }
        }
    }
}
