mod WithdrawalError {
    use freyr::utils::i256::i256;

    const ALREADY_INITIALIZED: felt252 = 'already_initialized';
    const NOT_FOUND: felt252 = 'withdrawal_not_found';
    const WITHDRAWAL_ACCOUNT_CANT_BE_ZERO: felt252 = 'withdrawal_account_cant_be_0';
    const EMPTY_WITHDRAWAL_AMOUNT: felt252 = 'empty_withdrawal_amount';
    const EMPTY_WITHDRAWAL: felt252 = 'empty_withdrawal';

    fn INSUFFICIENT_FEE_TOKEN_AMOUNT(data_1: u256, data_2: u256) {
        panic(
            array![
                'insufficient fee token amout',
                data_1.try_into().expect('u256 into felt failed'),
                data_2.try_into().expect('u256 into felt failed'),
            ],
        )
    }

    fn INSUFFICIENT_MARKET_TOKENS(data_1: u256, data_2: u256) {
        panic(
            array![
                'insufficient market token',
                data_1.try_into().expect('u256 into felt failed'),
                data_2.try_into().expect('u256 into felt failed'),
            ],
        )
    }

    fn INVALID_POOL_VALUE_FOR_WITHDRAWAL(data: i256) {
        panic(array!['insuff pool val for withdrawal', data.into()])
    }

    fn INVALID_WITHDRAWAL_KEY(data: felt252) {
        panic(array!['invalid withdrawal key', data])
    }
}
