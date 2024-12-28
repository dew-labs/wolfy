//! Contract to help with swap functions.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************
// Core lib imports.

// Local imports.
use freyr::swap::swap_utils::{SwapParams};
use starknet::ContractAddress;

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

    use freyr::market::market_utils::{IMarketUtilsDispatcherTrait, IMarketUtilsLibraryDispatcher};
    use freyr::role::role;
    use freyr::role::role_module::{IRoleModule, RoleModule};
    use freyr::role::role_module::{IRoleModuleDispatcherTrait, IRoleModuleLibraryDispatcher};
    use freyr::role::role_store::{IRoleStoreDispatcher};
    use freyr::swap::swap_utils;

    // Local imports.
    use freyr::swap::swap_utils::SwapParams;
    use freyr::utils::i256::i256;
    use openzeppelin::security::ReentrancyGuardComponent;
    use starknet::{ClassHash, ContractAddress};


    component!(path: ReentrancyGuardComponent, storage: reentrancy_guard, event: ReentrancyGuardEvent);

    impl InternalImpl = ReentrancyGuardComponent::InternalImpl<ContractState>;


    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        #[substorage(v0)]
        reentrancy_guard: ReentrancyGuardComponent::Storage,
        role_module: IRoleModuleLibraryDispatcher,
        market_utils: IMarketUtilsLibraryDispatcher,
    }

    // *************************************************************************
    //                              EVENT
    // *************************************************************************

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ReentrancyGuardEvent: ReentrancyGuardComponent::Event,
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************

    /// Constructor of the contract.
    #[constructor]
    fn constructor(
        ref self: ContractState,
        role_store_address: ContractAddress,
        role_module_class_hash: ClassHash,
        market_utils_class_hash: ClassHash,
    ) {
        self.role_module.write(IRoleModuleLibraryDispatcher { class_hash: role_module_class_hash });
        self.role_module.read().initialize(role_store_address);
        self.market_utils.write(IMarketUtilsLibraryDispatcher { class_hash: market_utils_class_hash });
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl SwapHandler of super::ISwapHandler<ContractState> {
        fn swap(ref self: ContractState, params: SwapParams) -> (ContractAddress, u256) {
            self.role_module.read().only_controller();

            self.reentrancy_guard.start();

            let (token_out, swap_output_amount) = swap_utils::swap(@params, self.market_utils.read());

            self.reentrancy_guard.end();

            (token_out, swap_output_amount)
        }
    }
}
