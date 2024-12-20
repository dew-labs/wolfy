//! Referral storage for testing and testnets.

// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.
use starknet::ContractAddress;

// *************************************************************************
//                  Interface of the `Governable` contract.
// *************************************************************************
#[starknet::interface]
trait IGovernable<TContractState> {
    fn initialize(ref self: TContractState, event_emitter_address: ContractAddress);
    fn only_gov(self: @TContractState);
    fn transfer_ownership(ref self: TContractState, new_gov: ContractAddress);
    fn accept_ownership(ref self: TContractState);
}

#[starknet::contract]
mod Governable {
    // *************************************************************************
    //                               IMPORTS
    // *************************************************************************

    // Core lib imports.
    use core::zeroable::Zeroable;

    // Local imports.
    use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
    use freyr::mock::error::MockError;
    use result::ResultTrait;
    use starknet::{get_caller_address, ContractAddress};

    // *************************************************************************
    //                              STORAGE
    // *************************************************************************
    #[storage]
    struct Storage {
        event_emitter: IEventEmitterDispatcher,
        gov: ContractAddress,
        pending_gov: ContractAddress,
    }

    // *************************************************************************
    //                          EXTERNAL FUNCTIONS
    // *************************************************************************
    #[abi(embed_v0)]
    impl Governable of super::IGovernable<ContractState> {
        fn initialize(ref self: ContractState, event_emitter_address: ContractAddress) {
            assert(self.gov.read().is_zero(), MockError::ALREADY_INITIALIZED);
            self.event_emitter.write(IEventEmitterDispatcher { contract_address: event_emitter_address });
            self._set_gov(get_caller_address())
        }

        fn only_gov(self: @ContractState) {
            if (get_caller_address() != self.gov.read()) {
                panic(array![MockError::UNAUTHORIZED_GOV])
            }
        }

        fn transfer_ownership(ref self: ContractState, new_gov: ContractAddress) {
            self.only_gov();
            self.pending_gov.write(new_gov);
        }

        fn accept_ownership(ref self: ContractState) {
            if (get_caller_address() != self.pending_gov.read()) {
                panic(array![MockError::UNAUTHORIZED_PENDING_GOV])
            }
            self._set_gov(get_caller_address());
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Updates the gov value to the input _gov value.
        /// # Arguments
        /// * `_gov` - The value to update to.
        fn _set_gov(ref self: ContractState, _gov: ContractAddress) {
            let prev_gov: ContractAddress = self.gov.read();
            self.gov.write(_gov);
            self.event_emitter.read().emit_set_gov(prev_gov, _gov);
        }
    }
}
