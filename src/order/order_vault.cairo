//! Contract to handle storing and transferring of tokens.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;
use starknet::ContractAddress;

// *************************************************************************
//                  Interface of the `OrderVault` contract.
// *************************************************************************
#[starknet::interface]
trait IOrderVault<TContractState> {
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
    /// Records a token transfer into the contract.
    /// # Arguments
    /// * `token` - The token address to transfer.
    /// # Returns
    /// * The amount of tokens transferred.
    fn record_transfer_in(ref self: TContractState, token: ContractAddress) -> u256;
    /// Updates the `token_balances` in case of token burns or similar balance changes.
    /// The `prev_balance` is not validated to be more than the `next_balance` as this
    /// could allow someone to block this call by transferring into the contract.
    /// # Arguments
    /// * `token` - The token to record the burn for.
    /// # Returns
    /// * The new balance.
    fn sync_token_balance(ref self: TContractState, token: ContractAddress) -> u256;
}

#[starknet::contract]
mod OrderVault {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use starknet::{get_caller_address, ContractAddress, contract_address_const, ClassHash};
    use starknet::storage::Map;

    // Local imports.
    use satoru::bank::strict_bank::{IStrictBankLibraryDispatcher, IStrictBankDispatcherTrait};
    use satoru::bank::bank::{IBankLibraryDispatcher};
    use satoru::role::role_module::{IRoleModuleLibraryDispatcher};
    use satoru::role::role_store::{IRoleStoreDispatcher};
    use satoru::data::data_store::{IDataStoreDispatcher};
    use debug::PrintTrait;

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        strict_bank: IStrictBankLibraryDispatcher,
        // StrictBank storage
        // token_balances: Map::<ContractAddress, u256>,
        // bank: IBankLibraryDispatcher,
        // data_store: IDataStoreDispatcher,
        // role_module: IRoleModuleLibraryDispatcher,
        // role_store: IRoleStoreDispatcher,
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************
    /// Constructor of the contract.
    /// # Arguments
    /// * `data_store_address` - The address of the data store contract.
    /// * `role_store_address` - The address of the role store contract.
    #[constructor]
    fn constructor(ref self: ContractState, data_store_address: ContractAddress, role_store_address: ContractAddress, strict_bank_class_hash: ClassHash, bank_class_hash: ClassHash, role_module_class_hash: ClassHash) {
        self.strict_bank.write(IStrictBankLibraryDispatcher { class_hash: strict_bank_class_hash });
        self.strict_bank.read().initialize(data_store_address, role_store_address, bank_class_hash, role_module_class_hash);
    }

    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl OrderVaultImpl of super::IOrderVault<ContractState> {
        fn transfer_out(
            ref self: ContractState,
            sender: ContractAddress,
            token: ContractAddress,
            receiver: ContractAddress,
            amount: u256,
        ) {
            self.strict_bank.read().transfer_out(sender, token, receiver, amount);
        }

        fn sync_token_balance(ref self: ContractState, token: ContractAddress) -> u256 {
            self.strict_bank.read().sync_token_balance(token)
        }

        fn record_transfer_in(ref self: ContractState, token: ContractAddress) -> u256 {
            self.strict_bank.read().record_transfer_in(token)
        }
    }
}
