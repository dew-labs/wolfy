//! Contract to handle storing and transferring of tokens.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;
use starknet::{ContractAddress, ClassHash};

// *************************************************************************
//                  Interface of the `Bank` contract.
// *************************************************************************
#[starknet::interface]
trait IBank<TContractState> {
    /// Initialize the contract.
    /// # Arguments
    /// * `data_store_address` - The address of the data store contract.
    /// * `role_store_address` - The address of the role store contract.
    fn initialize(
        ref self: TContractState,
        data_store_address: ContractAddress,
        role_store_address: ContractAddress,
        role_module_class_hash: ClassHash
    );

    /// Transfer tokens from this contract to a receiver.
    /// # Arguments
    /// * `token` - The token address to transfer.
    /// * `receiver` - The address of the receiver.
    /// * `amount` - The amount of tokens to transfer.
    fn transfer_out(
        ref self: TContractState,
        sender: ContractAddress,
        token: ContractAddress,
        receiver: ContractAddress,
        amount: u256,
    );
}

#[starknet::contract]
mod Bank {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use core::zeroable::Zeroable;
    use freyr::bank::error::BankError;

    // Local imports.
    use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use freyr::role::role;
    use freyr::role::role_module::{IRoleModuleLibraryDispatcher, IRoleModuleDispatcherTrait};
    use freyr::role::role_store::{IRoleStoreDispatcher};
    use freyr::token::erc20::interface::{IERC20, IERC20Dispatcher, IERC20DispatcherTrait};
    use freyr::token::token_utils::transfer;
    use starknet::{get_caller_address, get_contract_address, ContractAddress, ClassHash};
    use super::IBank;

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        data_store: IDataStoreDispatcher,
        role_module: IRoleModuleLibraryDispatcher,
        // RoleModule storage
    // role_store: IRoleStoreDispatcher,
    }

    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl BankImpl of super::IBank<ContractState> {
        fn initialize(
            ref self: ContractState,
            data_store_address: ContractAddress,
            role_store_address: ContractAddress,
            role_module_class_hash: ClassHash
        ) {
            // Make sure the contract is not already initialized.
            assert(self.data_store.read().contract_address.is_zero(), BankError::ALREADY_INITIALIZED);

            self.data_store.write(IDataStoreDispatcher { contract_address: data_store_address });
            self.role_module.write(IRoleModuleLibraryDispatcher { class_hash: role_module_class_hash });
            self.role_module.read().initialize(role_store_address);
        }

        fn transfer_out(
            ref self: ContractState,
            sender: ContractAddress,
            token: ContractAddress,
            receiver: ContractAddress,
            amount: u256,
        ) {
            // check that receiver is not this contract
            assert(receiver != get_contract_address(), BankError::SELF_TRANSFER_NOT_SUPPORTED);

            // assert that caller is a controller
            self.role_module.read().only_controller();

            // TODO: check for double spend error
            // transfer(self.data_store.read(), token, receiver, amount);
            IERC20Dispatcher { contract_address: token }.transfer_from(sender, receiver, amount);
        }
    }
}
