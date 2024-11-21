use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use starknet::ContractAddress;

#[starknet::interface]
trait ICallbackMock<TContractState> {
    fn get_counter(self: @TContractState) -> u32;
}

#[starknet::contract]
mod CallbackMock {
    use freyr::callback::deposit_callback_receiver::interface::IDepositCallbackReceiver;
    use freyr::deposit::deposit::Deposit;
    use freyr::event::event_utils::LogData;

    #[storage]
    struct Storage {
        counter: u32,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.counter.write(1);
    }


    #[abi(embed_v0)]
    impl ICallbackMockImpl of super::ICallbackMock<ContractState> {
        fn get_counter(self: @ContractState) -> u32 {
            self.counter.read()
        }
    }

    #[abi(embed_v0)]
    impl IDepositCallbackReceiverImpl of IDepositCallbackReceiver<ContractState> {
        fn after_deposit_execution(ref self: ContractState, key: felt252, deposit: Deposit, log_data: Array<felt252>,) {
            self.counter.write(self.get_counter() + 1);
        }

        fn after_deposit_cancellation(
            ref self: ContractState, key: felt252, deposit: Deposit, log_data: Array<felt252>,
        ) {
            self.counter.write(self.get_counter() + 1);
        }
    }
}

fn deploy_callback_mock() -> ICallbackMockDispatcher {
    let contract = declare("CallbackMock").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![]).unwrap();
    ICallbackMockDispatcher { contract_address }
}
