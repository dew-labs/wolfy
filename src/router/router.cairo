//! Users will approve this router for token expenditure.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;
use starknet::ContractAddress;

// *************************************************************************
//                  Interface of the `Router` contract.
// *************************************************************************
#[starknet::interface]
trait IRouter<TContractState> {
    /// Transfer the specified amount of tokens from the account to the receiver.
    /// # Arguments
    /// * `token` - The token address to transfer.
    /// * `account` - The account to transfer from.
    /// * `receiver` - The address of the receiver.
    /// * `amount` - The amount of tokens to transfer.
    fn plugin_transfer(
        ref self: TContractState,
        token: ContractAddress,
        account: ContractAddress,
        receiver: ContractAddress,
        amount: u256
    );
}

#[starknet::contract]
mod Router {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use core::zeroable::Zeroable;
    use satoru::role::role;
    use satoru::role::role_module::{IRoleModuleLibraryDispatcher, IRoleModuleDispatcherTrait};


    // Local imports.
    use satoru::role::role_store::{IRoleStoreDispatcher};
    use satoru::router::error::RouterError;
    use satoru::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    use starknet::{ContractAddress, get_caller_address, ClassHash};
    use super::IRouter;

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        role_module: IRoleModuleLibraryDispatcher,
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************

    /// Constructor of the contract.
    /// # Arguments
    /// * `role_store_address` - The address of the role store contract.
    #[constructor]
    fn constructor(ref self: ContractState, role_store_address: ContractAddress, role_module_class_hash: ClassHash,) {
        self.role_module.write(IRoleModuleLibraryDispatcher { class_hash: role_module_class_hash });
        self.role_module.read().initialize(role_store_address);
    }

    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl RouterImpl of super::IRouter<ContractState> {
        fn plugin_transfer(
            ref self: ContractState,
            token: ContractAddress,
            account: ContractAddress,
            receiver: ContractAddress,
            amount: u256
        ) {
            // Check that the caller has the `ROUTER_PLUGIN` role.
            self.role_module.read().only_router_plugin();

            // Transfer tokens from account to receiver.
            // It requires that account's allowance to this contract is at least `amount`.
            IERC20Dispatcher { contract_address: token }.transfer_from(account, receiver, amount.into());
        }
    }
}
