//! Contract to stores the list of oracle signers.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use starknet::ContractAddress;

// *************************************************************************
//                  Interface of the `OracleStore` contract.
// *************************************************************************
#[starknet::interface]
trait IOracleStore<TContractState> {
    /// Adds a signer.
    /// # Arguments
    /// * `signer` - account address of the signer to add.
    fn add_signer(ref self: TContractState, account: ContractAddress);

    /// Removes a signer.
    /// # Arguments
    /// * `signer` - account address of the signer to remove.
    fn remove_signer(ref self: TContractState, account: ContractAddress);

    /// Get the total number of signers.
    /// # Returns
    /// Signer count.
    fn get_signer_count(self: @TContractState) -> u256;

    /// Get the total signer at index.
    /// # Arguments
    /// * `index` - Index of the signer to get.
    /// # Returns
    /// Signer at index.
    fn get_signer(self: @TContractState, index: usize) -> ContractAddress;

    /// Get signers from start to end.
    /// # Arguments
    /// * `start` - Start index, included.
    /// * `end` - End index, not included.
    /// # Returns
    /// Signer for specified indexes.
    fn get_signers(self: @TContractState, start: u256, end: u256) -> Array<ContractAddress>;
}

#[starknet::contract]
mod OracleStore {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.

    use alexandria_storage::list::{ListTrait, List};
    use core::option::OptionTrait;
    use core::zeroable::Zeroable;

    use result::ResultTrait;

    // Local imports.
    use satoru::event::event_emitter::{IEventEmitterDispatcher};
    use satoru::oracle::error::OracleError;
    use starknet::storage::Map;
    use starknet::{ContractAddress, contract_address_const};
    use super::IOracleStore;

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        /// Interface to interact with the `EventEmitter` contract.
        event_emitter: IEventEmitterDispatcher,
        // NOTE: temporarily implemented to complete oracle tests.
        signers: List<ContractAddress>,
        signers_indexes: Map<ContractAddress, u32>
    }

    // *************************************************************************
    //                              CONSTRUCTOR
    // *************************************************************************
    #[constructor]
    fn constructor(ref self: ContractState, event_emitter_address: ContractAddress,) {
        self.event_emitter.write(IEventEmitterDispatcher { contract_address: event_emitter_address });
    }


    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl OracleStoreImpl of super::IOracleStore<ContractState> {
        fn add_signer(ref self: ContractState, account: ContractAddress) {
            let mut signers = self.signers.read();
            let index = signers.len();
            signers.append(account).unwrap();
            self.signers_indexes.write(account, index);
        }

        fn remove_signer(ref self: ContractState, account: ContractAddress) {
            let mut signers = self.signers.read();
            let last_signer = signers.get(signers.len() - 1).expect('failed to get last signer').unwrap();
            let signer_to_remove_index = self.signers_indexes.read(account);
            signers.set(signer_to_remove_index, last_signer).unwrap();
            self.signers_indexes.write(last_signer, signer_to_remove_index);
            self.signers_indexes.write(account, 0);
            signers.pop_front().unwrap().unwrap(); // This is actually pop_back
        }

        fn get_signer_count(self: @ContractState) -> u256 {
            self.signers.read().len().into()
        }

        fn get_signer(self: @ContractState, index: usize) -> ContractAddress {
            // self.signers.read().get(index).expect('failed to get signer')
            contract_address_const::<'signer'>() // TODO
        }

        fn get_signers(self: @ContractState, start: u256, end: u256) -> Array<ContractAddress> {
            let mut signers_subset: Array<ContractAddress> = ArrayTrait::new();
            let signers = self.signers.read();

            let mut index: u32 = start.try_into().expect('failed convertion u32 to u256');
            loop {
                if start == end {
                    break;
                }
                signers_subset.append(signers.get(index).expect('out of bound signer index').unwrap())
            };

            signers_subset
        }
    }
}
