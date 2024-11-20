//! Contract to handle time lock.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use core::traits::Into;
use starknet::ContractAddress;

// *************************************************************************
//                  Interface of the `DepositVault` contract.
// *************************************************************************
#[starknet::interface]
trait IDepositVault<TContractState> {
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

    /// this can be used to update the tokenBalances in case of token burns
    /// or similar balance changes
    /// the prevBalance is not validated to be more than the nextBalance as this
    /// could allow someone to block this call by transferring into the contract
    /// # Arguments
    /// * `token` - The token to record the burn for
    /// # Return
    /// The new balance
    fn sync_token_balance(ref self: TContractState, token: ContractAddress) -> u256;
}

#[starknet::contract]
mod DepositVault {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use core::zeroable::Zeroable;
    use starknet::{get_caller_address, ContractAddress, contract_address_const, ClassHash};
    use starknet::storage::Map;


    // Local imports.
    use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
    use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
    use satoru::bank::strict_bank::{IStrictBankLibraryDispatcher, IStrictBankDispatcherTrait};
    use satoru::bank::bank::{IBankLibraryDispatcher};
    use satoru::role::role_module::{IRoleModuleLibraryDispatcher};


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
    /// * `role_store_address` - The address of the role store contract.
    /// * `data_store_address` - The address of the data store contract.
    #[constructor]
    fn constructor(ref self: ContractState, data_store_address: ContractAddress, role_store_address: ContractAddress, strict_bank_class_hash: ClassHash, bank_class_hash: ClassHash, role_module_class_hash: ClassHash) {
        self.strict_bank.write(IStrictBankLibraryDispatcher { class_hash: strict_bank_class_hash });
        self.strict_bank.read().initialize(data_store_address, role_store_address, bank_class_hash, role_module_class_hash);
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl DepositVaultImpl of super::IDepositVault<ContractState> {
        fn transfer_out(
            ref self: ContractState,
            sender: ContractAddress,
            token: ContractAddress,
            receiver: ContractAddress,
            amount: u256,
        ) {
            self.strict_bank.read().transfer_out(sender, token, receiver, amount);
        }

        fn record_transfer_in(ref self: ContractState, token: ContractAddress) -> u256 {
            self.strict_bank.read().record_transfer_in(token)
        }

        fn sync_token_balance(ref self: ContractState, token: ContractAddress) -> u256 {
            self.strict_bank.read().sync_token_balance(token)
        }
    }
}
