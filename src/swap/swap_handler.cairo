//! Contract to help with swap functions.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************
// Core lib imports.
use starknet::ContractAddress;

// Local imports.
use satoru::swap::swap_utils::{SwapParams};

// *************************************************************************
//                  Interface of the `SwapHandler` contract.
// *************************************************************************
#[starknet::interface]
trait ISwapHandler<TContractState> {
    /// Perform a swap based on the given params.
    /// # Arguments
    /// * `params` - SwapParams.
    /// # Returns
    /// * (outputToken, outputAmount)
    fn swap(ref self: TContractState, params: SwapParams) -> (ContractAddress, u256);
}

#[starknet::contract]
mod SwapHandler {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************
    // Core lib imports
    use starknet::ContractAddress;

    // Local imports.
    use satoru::swap::swap_utils::SwapParams;
    use satoru::swap::swap_utils;
    use satoru::role::role_module::{RoleModule, IRoleModule};
    use satoru::utils::i256::i256;
    use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};

    use openzeppelin::security::ReentrancyGuardComponent;

    component!(
        path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent
    );

    impl InternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;


    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
        /// Interface to interact with the `DataStore` contract.
        data_store: IDataStoreDispatcher
    }

    // *************************************************************************
    //                              EVENT
    // *************************************************************************

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************

    /// Constructor of the contract.
    #[constructor]
    fn constructor(ref self: ContractState, role_store_address: ContractAddress,) {
        let mut role_module: RoleModule::ContractState = RoleModule::unsafe_new_contract_state();
        IRoleModule::initialize(ref role_module, role_store_address);
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl SwapHandler of super::ISwapHandler<ContractState> {
        fn swap(ref self: ContractState, params: SwapParams) -> (ContractAddress, u256) {
            let mut role_module: RoleModule::ContractState = RoleModule::unsafe_new_contract_state();
            role_module.only_controller();

            self.reentrancy_guard.start();

            let (token_out, swap_output_amount) = swap_utils::swap(@params);

            self.reentrancy_guard.end();

            (token_out, swap_output_amount)
        }
    }
}
