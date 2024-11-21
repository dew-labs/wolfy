//! Contract to handle storing and transferring of tokens.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;
use starknet::ContractAddress;

// *************************************************************************
//                  Interface of the `FeeHandler` contract.
// *************************************************************************
#[starknet::interface]
trait IFeeHandler<TContractState> {
    /// Claim fees from the specified markets.
    /// # Arguments
    /// * `market` - The markets to claim fees from.
    /// * `tokens` - The fee tokens to claim.
    fn claim_fees(ref self: TContractState, market: Array<ContractAddress>, tokens: Array<ContractAddress>);
}

#[starknet::contract]
mod FeeHandler {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use core::zeroable::Zeroable;
    use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use freyr::data::keys;
    use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use freyr::fee::error::FeeError;
    use freyr::fee::fee_utils;


    // Local imports.
    use freyr::role::role_module::{IRoleModuleLibraryDispatcher, IRoleModuleDispatcherTrait};
    use starknet::{get_caller_address, ContractAddress, contract_address_const, ClassHash};
    use super::IFeeHandler;

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        /// Interface to interact with the `DataStore` contract.
        data_store: IDataStoreDispatcher,
        /// Interface to interact with the `EventEmitter` contract.
        event_emitter: IEventEmitterDispatcher,
        role_module: IRoleModuleLibraryDispatcher,
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************

    /// Constructor of the contract.
    /// # Arguments
    /// * `data_store_address` - The address of the data store contract.
    /// * `role_store_address` - The address of the role store contract.
    /// * `event_emitter_address` - The address of the event emitter contract.

    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        role_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        role_module_class_hash: ClassHash,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self.event_emitter.write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self.role_module.write(IRoleModuleLibraryDispatcher { class_hash: role_module_class_hash });
        self.role_module.read().initialize(role_store_address);
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl FeeHandlerImpl of super::IFeeHandler<ContractState> {
        /// Claim fees for the specified market.
        /// # Arguments
        /// * `markets` - The market to claim fees from.
        /// * `tokens` - The fee tokens.
        fn claim_fees(ref self: ContractState, market: Array<ContractAddress>, tokens: Array<ContractAddress>) {
            // Only the fee keeper can claim fees
            self.role_module.read().only_fee_keeper();

            assert(market.len() == tokens.len(), FeeError::INVALID_CLAIM_FEES_INPUT);

            let data_store = self.data_store.read();

            let receiver = data_store.get_address(keys::fee_receiver());

            let mut i = 0;
            loop {
                if i == market.len() {
                    break;
                }

                fee_utils::claim_fees(data_store, self.event_emitter.read(), *market.at(i), *tokens.at(i), receiver);

                i += 1;
            };
        }
    }
}
