//! Contract to create markets.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;
use starknet::{ClassHash, ContractAddress};

// *************************************************************************
//                  Interface of the `MarketFactory` contract.
// *************************************************************************
#[starknet::interface]
trait IMarketFactory<TContractState> {
    /// Create a new market.
    /// # Arguments
    /// * `index_token` - The token used as the index of the market.
    /// * `long_token` - The token used as the long side of the market.
    /// * `short_token` - The token used as the short side of the market.
    /// * `market_type` - The type of the market.
    fn create_market(
        ref self: TContractState,
        index_token: ContractAddress,
        long_token: ContractAddress,
        short_token: ContractAddress,
        market_type: felt252,
    ) -> ContractAddress;

    /// Update the class hash of the `MarketToken` contract to deploy when creating a new market.
    /// # Arguments
    /// * `market_token_class` - The class hash of the `MarketToken` contract to
    /// deploy when creating a new market.
    fn update_market_token_class(ref self: TContractState, market_token_class: ClassHash);
}

#[starknet::contract]
mod MarketFactory {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use core::result::ResultTrait;
    use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use freyr::market::market::{Market, UniqueIdMarket};
    use freyr::role::role_module::{IRoleModuleDispatcherTrait, IRoleModuleLibraryDispatcher};


    // Local imports.
    use freyr::role::role_store::{IRoleStoreDispatcher};
    use poseidon::poseidon_hash_span;
    use starknet::syscalls::deploy_syscall;
    use starknet::{ClassHash, ContractAddress, contract_address_const, get_caller_address};

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        event_emitter: IEventEmitterDispatcher,
        market_token_class_hash: ClassHash,
        bank_class_hash: ClassHash,
        role_module_class_hash: ClassHash,
        role_module: IRoleModuleLibraryDispatcher,
        // RoleModule storage
        role_store: IRoleStoreDispatcher,
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************

    /// Constructor of the contract.
    /// # Arguments
    /// * `data_store_address` - The address of the data store contract.
    /// * `role_store_address` - The address of the role store contract.
    /// * `event_emitter_address` - The address of the event emitter contract.
    /// * `market_token_class` - The class hash of the `MarketToken` contract to
    /// deploy when creating a new market.
    #[constructor]
    fn constructor(
        ref self: ContractState,
        data_store_address: ContractAddress,
        role_store_address: ContractAddress,
        event_emitter_address: ContractAddress,
        market_token_class_hash: ClassHash,
        bank_class_hash: ClassHash,
        role_module_class_hash: ClassHash,
    ) {
        self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
        self.event_emitter.write(IEventEmitterDispatcher { contract_address: event_emitter_address });
        self.market_token_class_hash.write(market_token_class_hash);
        self.bank_class_hash.write(bank_class_hash);
        self.role_module.write(IRoleModuleLibraryDispatcher { class_hash: role_module_class_hash });
        self.role_module.read().initialize(role_store_address);
        self.role_module_class_hash.write(role_module_class_hash);
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl MarketFactory of super::IMarketFactory<ContractState> {
        fn create_market(
            ref self: ContractState,
            index_token: ContractAddress,
            long_token: ContractAddress,
            short_token: ContractAddress,
            market_type: felt252,
        ) -> ContractAddress {
            // Get the caller address.
            let caller_address = get_caller_address();
            // Check that the caller has the `MARKET_KEEPER` role.
            self.role_module.read().only_market_keeper();

            // Compute the salt to use when deploying the `MarketToken` contract.
            let salt = self.compute_salt_for_deploy_market_token(index_token, long_token, short_token, market_type);

            // Deploy the `MarketToken` contract.
            // Contructor arguments: [role_store_address, data_store_address].
            let mut constructor_calldata: Array<felt252> = array![
                self.role_store.read().contract_address.into(),
                self.data_store.read().contract_address.into(),
                self.bank_class_hash.read().into(),
                self.role_module_class_hash.read().into(),
            ];
            // Deploy the contract with the `deploy_syscall`.
            let (market_token_deployed_address, _return_data) = deploy_syscall(
                self.market_token_class_hash.read(), salt, constructor_calldata.span(), false,
            )
                .expect('failed to deploy market');

            // Create the market.
            let market = Market { market_token: market_token_deployed_address, index_token, long_token, short_token };
            // Add the market to the data store.
            self.data_store.read().set_market(market_token_deployed_address, salt, market);

            // Emit the event.
            self
                .event_emitter
                .read()
                .emit_market_created(
                    caller_address, market_token_deployed_address, index_token, long_token, short_token, market_type,
                );

            // Return the market token address and the market key.
            market_token_deployed_address
        }

        fn update_market_token_class(ref self: ContractState, market_token_class: ClassHash) {
            // Get the caller address.
            let caller_address = get_caller_address();
            // Check that the caller has the `MARKET_KEEPER` role.
            self.role_module.read().only_market_keeper();

            let old_market_token_class = self.market_token_class_hash.read();

            // Update the class hash.
            self.market_token_class_hash.write(market_token_class);

            // Emit the event.
            self
                .event_emitter
                .read()
                .emit_market_token_class_updated(caller_address, old_market_token_class, market_token_class);
        }
    }

    // *************************************************************************
    //                          INTERNAL FUNCTIONS
    // *************************************************************************
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Compute a salt to use when deploying a new `MarketToken` contract.
        /// # Arguments
        /// * `market_type` - The type of the market.
        fn compute_salt_for_deploy_market_token(
            self: @ContractState,
            index_token: ContractAddress,
            long_token: ContractAddress,
            short_token: ContractAddress,
            market_type: felt252,
        ) -> felt252 {
            let mut data = array![];
            data.append('WOLFY_MARKET');
            data.append(index_token.into());
            data.append(long_token.into());
            data.append(short_token.into());
            data.append(market_type);
            poseidon_hash_span(data.span())
        }
    }
}
