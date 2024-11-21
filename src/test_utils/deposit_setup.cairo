// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.

use debug::PrintTrait;
use result::ResultTrait;
use freyr::bank::bank::{IBankDispatcherTrait, IBankDispatcher};
use freyr::bank::strict_bank::{IStrictBankDispatcher, IStrictBankDispatcherTrait};


// Local imports.
use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::data::keys;
use freyr::deposit::deposit::Deposit;
use freyr::deposit::deposit_utils::CreateDepositParams;
use freyr::deposit::deposit_utils;
use freyr::deposit::deposit_vault::{IDepositVaultDispatcher, IDepositVaultDispatcherTrait};
use freyr::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use freyr::exchange::deposit_handler::{IDepositHandlerDispatcher, IDepositHandlerDispatcherTrait};

use freyr::exchange::liquidation_handler::{ILiquidationHandlerDispatcher, ILiquidationHandlerDispatcherTrait};
use freyr::exchange::order_handler::{OrderHandler, IOrderHandlerDispatcher, IOrderHandlerDispatcherTrait};

use freyr::exchange::withdrawal_handler::{IWithdrawalHandlerDispatcher, IWithdrawalHandlerDispatcherTrait};
use freyr::market::market::{Market, UniqueIdMarket};
use freyr::market::market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait};
use freyr::market::market_token::{IMarketTokenDispatcher, IMarketTokenDispatcherTrait};
use freyr::market::market_utils;
use freyr::market::{market::{UniqueIdMarketImpl},};
use freyr::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
use freyr::oracle::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
use freyr::oracle::oracle_store::{IOracleStoreDispatcher, IOracleStoreDispatcherTrait};
use freyr::oracle::oracle_utils::SetPricesParams;
use freyr::order::base_order_utils::{CreateOrderParams};
use freyr::order::order::{Order, OrderType, SecondaryOrderType, DecreasePositionSwapType};
use freyr::order::order_utils::{IOrderUtilsDispatcher, IOrderUtilsDispatcherTrait};
use freyr::order::order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait};
use freyr::position::position_utils;
use freyr::price::price::{Price, PriceTrait};
use freyr::reader::reader::{IReaderDispatcher, IReaderDispatcherTrait};
use freyr::role::role;
use freyr::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use freyr::router::exchange_router::{IExchangeRouterDispatcher, IExchangeRouterDispatcherTrait};
use freyr::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
use freyr::test_utils::tests_lib;
use freyr::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use freyr::utils::span32::{Span32, DefaultSpan32, Array32Trait};
use freyr::withdrawal::withdrawal::Withdrawal;
use freyr::withdrawal::withdrawal_utils;
use freyr::withdrawal::withdrawal_vault::{IWithdrawalVaultDispatcher, IWithdrawalVaultDispatcherTrait};
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number, ContractClassTrait,
    ContractClass
};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash,};
use traits::{TryInto, Into};

fn deposit_setup(
    long_token_amount: u256, short_token_amount: u256
) -> (
    ContractAddress,
    ContractClass,
    IMarketFactoryDispatcher,
    IRoleStoreDispatcher,
    IDataStoreDispatcher,
    IEventEmitterDispatcher,
    IExchangeRouterDispatcher,
    IDepositHandlerDispatcher,
    IDepositVaultDispatcher,
    IOracleDispatcher,
    IOrderHandlerDispatcher,
    IOrderVaultDispatcher,
    IReaderDispatcher,
    IReferralStorageDispatcher,
    IWithdrawalHandlerDispatcher,
    IWithdrawalVaultDispatcher,
    ILiquidationHandlerDispatcher,
    Market,
) {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        caller_address,
        market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        _role_module_class,
        _bank_class,
        _governable_class,
        market_factory,
        role_store,
        data_store,
        event_emitter,
        exchange_router,
        deposit_handler,
        deposit_vault,
        oracle,
        order_handler,
        order_vault,
        reader,
        referal_storage,
        withdrawal_handler,
        withdrawal_vault,
        liquidation_handler,
        _,
        _,
        _,
        _,
    ) =
        tests_lib::setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create a market.
    let market = data_store.get_market(tests_lib::create_market(market_factory));

    // Set params in data_store
    data_store.set_address(keys::fee_token(), market.index_token);
    data_store.set_u256(keys::max_swap_path_length(), 5);

    // Set max pool amount.
    data_store
        .set_u256(
            keys::max_pool_amount_key(market.market_token, market.long_token),
            5000000000000000000000000000000000000000000 // 500 000 ETH
        );
    data_store
        .set_u256(
            keys::max_pool_amount_key(market.market_token, market.short_token),
            2500000000000000000000000000000000000000000000 // 250 000 000 USDC
        );

    // Long setups

    let factor_for_deposits: felt252 = keys::max_pnl_factor_for_deposits();
    let factor_for_withdrawal: felt252 = keys::max_pnl_factor_for_withdrawals();

    data_store
        .set_u256(
            keys::max_pnl_factor_key(factor_for_deposits, market.market_token, true),
            50000000000000000000000000000000000000000000000
        );
    data_store
        .set_u256(
            keys::max_pnl_factor_key(factor_for_withdrawal, market.market_token, true),
            50000000000000000000000000000000000000000000000
        );
    data_store.set_u256(keys::reserve_factor_key(market.market_token, true), 10000000000000000000000000);
    data_store.set_u256(keys::open_interest_reserve_factor_key(market.market_token, true), 1000000000000000000000000);

    // Short setup
    data_store
        .set_u256(
            keys::max_pnl_factor_key(factor_for_deposits, market.market_token, false),
            50000000000000000000000000000000000000000000000
        );
    data_store
        .set_u256(
            keys::max_pnl_factor_key(factor_for_withdrawal, market.market_token, false),
            50000000000000000000000000000000000000000000000
        );
    data_store.set_u256(keys::reserve_factor_key(market.market_token, false), 1000000000000000000000000);
    data_store.set_u256(keys::open_interest_reserve_factor_key(market.market_token, false), 1000000000000000000000000);

    // data_store.set_bool('REENTRANCY_GUARD_STATUS', false);

    // Fill the account
    IERC20Dispatcher { contract_address: market.long_token }.mint(caller_address, 9999999999999000000); // 9.999 ETH
    IERC20Dispatcher { contract_address: market.short_token }
        .mint(caller_address, 49999999999999999000000); // 49.999 UDC
    'filled account'.print();

    // INITIAL LONG TOKEN IN POOL : 5 ETH
    // INITIAL SHORT TOKEN IN POOL : 25000 USDC

    let balance_deposit_vault_before = IERC20Dispatcher { contract_address: market.short_token }
        .balance_of(deposit_vault.contract_address);
    let balance_caller_ETH = IERC20Dispatcher { contract_address: market.long_token }.balance_of(caller_address);
    let balance_caller_USDC = IERC20Dispatcher { contract_address: market.short_token }.balance_of(caller_address);

    assert(balance_deposit_vault_before == 0, 'balance deposit should be 0');
    assert(balance_caller_ETH == 10000000000000000000, 'balanc ETH should be 10 ETH');
    assert(balance_caller_USDC == 50000000000000000000000, 'USDC be 50 000 USDC');

    // Send token to deposit in the deposit vault (this should be in a multi call with create_deposit)
    start_cheat_caller_address(market.long_token, caller_address);
    start_cheat_caller_address(market.short_token, caller_address);

    IERC20Dispatcher { contract_address: market.long_token }.approve(caller_address, long_token_amount);
    IERC20Dispatcher { contract_address: market.short_token }.approve(caller_address, short_token_amount);

    IERC20Dispatcher { contract_address: market.long_token }.mint(caller_address, long_token_amount); // 20 ETH
    IERC20Dispatcher { contract_address: market.short_token }.mint(caller_address, short_token_amount); // 100 000 USDC

    role_store.grant_role(caller_address, role::ROUTER_PLUGIN);
    role_store.grant_role(exchange_router.contract_address, role::ROUTER_PLUGIN);

    role_store
        .grant_role(
            order_handler.contract_address, role::CONTROLLER
        ); // for tests::integration::swap_test::test_swap_market

    exchange_router.send_tokens(market.long_token, deposit_vault.contract_address, long_token_amount);
    exchange_router.send_tokens(market.short_token, deposit_vault.contract_address, short_token_amount);

    stop_cheat_caller_address(market.long_token);
    stop_cheat_caller_address(market.short_token);

    // Create Deposit

    let addresss_zero: ContractAddress = 0.try_into().unwrap();

    let params = CreateDepositParams {
        receiver: caller_address,
        callback_contract: addresss_zero,
        ui_fee_receiver: addresss_zero,
        market: market.market_token,
        initial_long_token: market.long_token,
        initial_short_token: market.short_token,
        long_token_swap_path: Array32Trait::<ContractAddress>::span32(@array![]),
        short_token_swap_path: Array32Trait::<ContractAddress>::span32(@array![]),
        min_market_tokens: 0,
        execution_fee: 0,
        callback_gas_limit: 0,
    };
    'create deposit'.print();

    start_cheat_block_number(deposit_handler.contract_address, 1910);
    let key = deposit_handler.create_deposit(caller_address, params);
    let first_deposit = data_store.get_deposit(key);

    'created deposit'.print();

    assert(first_deposit.account == caller_address, 'Wrong account depositer');
    assert(first_deposit.receiver == caller_address, 'Wrong account receiver');
    assert(first_deposit.initial_long_token == market.long_token, 'Wrong initial long token');
    assert(first_deposit.initial_long_token_amount == long_token_amount, 'Wrong initial long token amount');
    assert(first_deposit.initial_short_token_amount == short_token_amount, 'Wrong init short token amount');

    'execute deposit'.print();

    let price_params = SetPricesParams {
        signer_info: 0,
        tokens: array![contract_address_const::<'ETH'>(), contract_address_const::<'USDC'>()],
        compacted_min_oracle_block_numbers: array![1910, 1910],
        compacted_max_oracle_block_numbers: array![1920, 1920],
        compacted_oracle_timestamps: array![9999, 9999],
        compacted_decimals: array![1, 1],
        compacted_min_prices: array![2147483648010000], // 500000, 10000 compacted
        compacted_min_prices_indexes: array![0],
        compacted_max_prices: array![4000, 1], // 500000, 10000 compacted
        compacted_max_prices_indexes: array![0],
        signatures: array![array!['signatures1', 'signatures2'].span(), array!['signatures1', 'signatures2'].span()],
        price_feed_tokens: array![]
    };

    start_cheat_caller_address(role_store.contract_address, caller_address);

    role_store.grant_role(caller_address, role::ORDER_KEEPER);
    role_store.grant_role(deposit_handler.contract_address, role::CONTROLLER);
    role_store.grant_role(exchange_router.contract_address, role::CONTROLLER);

    start_cheat_block_number(deposit_handler.contract_address, 1915);
    deposit_handler.execute_deposit(key, price_params);

    'executed deposit'.print();

    // let pool_value_info = market_utils::get_pool_value_info(
    //     data_store,
    //     market,
    //     Price { min: 2000, max: 2000 },
    //     Price { min: 2000, max: 2000 },
    //     Price { min: 2000, max: 2000 },
    //     keys::max_pnl_factor_for_deposits(),
    //     true,
    // );

    // assert(pool_value_info.pool_value.mag == 42000000000000000000000, 'wrong pool value amount');
    // assert(pool_value_info.long_token_amount == 6000000000000000000, 'wrong long token amount');
    // assert(pool_value_info.short_token_amount == 30000000000000000000000, 'wrong short token amount');

    let not_deposit = data_store.get_deposit(key);
    let default_deposit: Deposit = Default::default();
    assert(not_deposit == default_deposit, 'Still existing deposit');

    let market_token_dispatcher = IMarketTokenDispatcher { contract_address: market.market_token };
    let balance_market_token = market_token_dispatcher.balance_of(caller_address);

    assert(balance_market_token != 0, 'should receive market token');

    let _balance_deposit_vault_after = IERC20Dispatcher { contract_address: market.short_token }
        .balance_of(deposit_vault.contract_address);

    (
        caller_address,
        market_token_class,
        market_factory,
        role_store,
        data_store,
        event_emitter,
        exchange_router,
        deposit_handler,
        deposit_vault,
        oracle,
        order_handler,
        order_vault,
        reader,
        referal_storage,
        withdrawal_handler,
        withdrawal_vault,
        liquidation_handler,
        market
    )
}

fn exec_order(
    order_handler: IOrderHandlerDispatcher,
    role_store: IRoleStoreDispatcher,
    key: felt252,
    long_token_price: u256,
    short_token_price: u256
) -> () {
    let _signatures: Span<felt252> = array![0].span();
    let set_price_params = SetPricesParams {
        signer_info: 0,
        tokens: array![contract_address_const::<'ETH'>(), contract_address_const::<'USDC'>()],
        compacted_min_oracle_block_numbers: array![1910, 1910],
        compacted_max_oracle_block_numbers: array![1920, 1920],
        compacted_oracle_timestamps: array![9999, 9999],
        compacted_decimals: array![1, 1],
        compacted_min_prices: array![2147483648010000], // 500000, 10000 compacted
        compacted_min_prices_indexes: array![0],
        compacted_max_prices: array![long_token_price, short_token_price], // 500000, 10000 compacted
        compacted_max_prices_indexes: array![0],
        signatures: array![array!['signatures1', 'signatures2'].span(), array!['signatures1', 'signatures2'].span()],
        price_feed_tokens: array![]
    };

    let keeper_address = contract_address_const::<'keeper'>();
    role_store.grant_role(keeper_address, role::ORDER_KEEPER);

    stop_cheat_caller_address(order_handler.contract_address);
    start_cheat_caller_address(order_handler.contract_address, keeper_address);

    // TODO add real signatures check on Oracle Account
    order_handler.execute_order(key, set_price_params);
}
