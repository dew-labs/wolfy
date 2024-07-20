// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.

use result::ResultTrait;
use debug::PrintTrait;
use traits::{TryInto, Into};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash,};
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number, ContractClassTrait,
    ContractClass
};


// Local imports.
use satoru::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use satoru::role::role_store::{IRoleStoreDispatcher, IRoleStoreDispatcherTrait};
use satoru::market::market_factory::{IMarketFactoryDispatcher, IMarketFactoryDispatcherTrait};
use satoru::event::event_emitter::{IEventEmitterDispatcher, IEventEmitterDispatcherTrait};
use satoru::deposit::deposit_vault::{IDepositVaultDispatcher, IDepositVaultDispatcherTrait};
use satoru::deposit::deposit::Deposit;
use satoru::withdrawal::withdrawal::Withdrawal;

use satoru::exchange::withdrawal_handler::{IWithdrawalHandlerDispatcher, IWithdrawalHandlerDispatcherTrait};
use satoru::exchange::deposit_handler::{IDepositHandlerDispatcher, IDepositHandlerDispatcherTrait};
use satoru::router::exchange_router::{IExchangeRouterDispatcher, IExchangeRouterDispatcherTrait};
use satoru::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
use satoru::reader::reader::{IReaderDispatcher, IReaderDispatcherTrait};
use satoru::market::market::{Market, UniqueIdMarket};
use satoru::market::market_token::{IMarketTokenDispatcher, IMarketTokenDispatcherTrait};
use satoru::role::role;
use satoru::oracle::oracle_utils::SetPricesParams;
use satoru::test_utils::tests_lib;
use satoru::deposit::deposit_utils::CreateDepositParams;
use satoru::utils::span32::{Span32, DefaultSpan32, Array32Trait};
use satoru::deposit::deposit_utils;
use satoru::bank::bank::{IBankDispatcherTrait, IBankDispatcher};
use satoru::bank::strict_bank::{IStrictBankDispatcher, IStrictBankDispatcherTrait};
use satoru::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use satoru::oracle::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
use satoru::withdrawal::withdrawal_vault::{IWithdrawalVaultDispatcher, IWithdrawalVaultDispatcherTrait};
use satoru::data::keys;
use satoru::market::market_utils;
use satoru::price::price::{Price, PriceTrait};
use satoru::position::position_utils;
use satoru::withdrawal::withdrawal_utils;

use satoru::order::order::{Order, OrderType, SecondaryOrderType, DecreasePositionSwapType};
use satoru::order::order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait};
use satoru::order::base_order_utils::{CreateOrderParams};
use satoru::oracle::oracle_store::{IOracleStoreDispatcher, IOracleStoreDispatcherTrait};
use satoru::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
use satoru::market::{market::{UniqueIdMarketImpl},};
use satoru::exchange::order_handler::{OrderHandler, IOrderHandlerDispatcher, IOrderHandlerDispatcherTrait};
const INITIAL_TOKENS_MINTED: felt252 = 1000;
use satoru::test_utils::tests_lib::{setup, teardown, create_market};

#[test]
fn test_swap_market_integration() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
    let (
        caller_address,
        market_factory_address,
        role_store_address,
        data_store_address,
        market_token_class_hash,
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
    ) =
        setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    // Create a market.
    let market = data_store.get_market(create_market(market_factory));

    // Set params in data_store
    data_store.set_address(keys::fee_token(), market.index_token);
    data_store.set_u256(keys::max_swap_path_length(), 5);

    // Set max pool amount.
    data_store
        .set_u256(
            keys::max_pool_amount_key(market.market_token, market.long_token), 500000000000000000
        );
    data_store
        .set_u256(
            keys::max_pool_amount_key(market.market_token, market.short_token), 500000000000000000
        );

    oracle.set_price_testing_eth(5000);

    // Fill the pool.
    IERC20Dispatcher { contract_address: market.long_token }.mint(market.market_token, 50000000000);
    IERC20Dispatcher { contract_address: market.short_token }
        .mint(market.market_token, 50000000000);
    // TODO Check why we don't need to set pool_amount_key
    // // Set pool amount in data_store.
    // let mut key = keys::pool_amount_key(market.market_token, contract_address_const::<'ETH'>());
    // data_store.set_u256(key, 50000000000);
    // key = keys::pool_amount_key(market.market_token, contract_address_const::<'USDC'>());
    // data_store.set_u256(key, 50000000000);

    // Send token to deposit in the deposit vault (this should be in a multi call with create_deposit)
    IERC20Dispatcher { contract_address: market.long_token }
        .mint(deposit_vault.contract_address, 50000000000);
    IERC20Dispatcher { contract_address: market.short_token }
        .mint(deposit_vault.contract_address, 50000000000);

    let balance_deposit_vault_before = IERC20Dispatcher { contract_address: market.short_token }
        .balance_of(deposit_vault.contract_address);

    // Create Deposit
    let user1: ContractAddress = contract_address_const::<'user1'>();
    let user2: ContractAddress = contract_address_const::<'user2'>();

    let addresss_zero: ContractAddress = 0.try_into().unwrap();

    let params = CreateDepositParams {
        receiver: user1,
        callback_contract: user2,
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

    start_cheat_block_number(deposit_handler.contract_address, 1910);
    let key = deposit_handler.create_deposit(caller_address, params);
    let first_deposit = data_store.get_deposit(key);

    assert(first_deposit.account == caller_address, 'Wrong account depositer');
    assert(first_deposit.receiver == user1, 'Wrong account receiver');
    assert(first_deposit.initial_long_token == market.long_token, 'Wrong initial long token');
    assert(
        first_deposit.initial_long_token_amount == 50000000000, 'Wrong initial long token amount'
    );
    assert(
        first_deposit.initial_short_token_amount == 50000000000, 'Wrong init short token amount'
    );

    let price_params = SetPricesParams { // TODO
        signer_info: 1,
        tokens: array![contract_address_const::<'ETH'>(), contract_address_const::<'USDC'>()],
        compacted_min_oracle_block_numbers: array![1900, 1900],
        compacted_max_oracle_block_numbers: array![1910, 1910],
        compacted_oracle_timestamps: array![9999, 9999],
        compacted_decimals: array![18, 18],
        compacted_min_prices: array![4294967346000000], // 50000000, 1000000 compacted
        compacted_min_prices_indexes: array![0],
        compacted_max_prices: array![4294967346000000], // 50000000, 1000000 compacted
        compacted_max_prices_indexes: array![0],
        signatures: array![
            array!['signatures1', 'signatures2'].span(), array!['signatures1', 'signatures2'].span()
        ],
        price_feed_tokens: array![]
    };

    start_cheat_caller_address(role_store.contract_address, caller_address);

    role_store.grant_role(caller_address, role::ORDER_KEEPER);
    role_store.grant_role(caller_address, role::ROLE_ADMIN);
    role_store.grant_role(caller_address, role::CONTROLLER);
    role_store.grant_role(caller_address, role::MARKET_KEEPER);

    // Execute Deposit
    start_cheat_block_number(deposit_handler.contract_address, 1915);
    deposit_handler.execute_deposit(key, price_params);

    let pool_value_info = market_utils::get_pool_value_info(
        data_store,
        market,
        Price { min: 1999, max: 2000 },
        Price { min: 1999, max: 2000 },
        Price { min: 1999, max: 2000 },
        keys::max_pnl_factor_for_deposits(),
        true,
    );

    assert(pool_value_info.pool_value.mag == 200000000000000, 'wrong pool value amount');
    assert(pool_value_info.long_token_amount == 50000000000, 'wrong long token amount');
    assert(pool_value_info.short_token_amount == 50000000000, 'wrong short token amount');

    let not_deposit = data_store.get_deposit(key);
    let default_deposit: Deposit = Default::default();
    assert(not_deposit == default_deposit, 'Still existing deposit');

    // let market_token_dispatcher = IMarketTokenDispatcher { contract_address: market.market_token };

    // let balance = market_token_dispatcher.balance_of(user1);

    let balance_deposit_vault = IERC20Dispatcher { contract_address: market.short_token }
        .balance_of(deposit_vault.contract_address);

    let pool_value_info = market_utils::get_pool_value_info(
        data_store,
        market,
        Price { min: 5000, max: 5000, },
        Price { min: 5000, max: 5000, },
        Price { min: 1, max: 1, },
        keys::max_pnl_factor_for_deposits(),
        true,
    );

    pool_value_info.pool_value.mag.print();
    pool_value_info.long_token_amount.print();
    pool_value_info.short_token_amount.print();

    // // --------------------SWAP TEST USDC->ETH --------------------

    let balance_ETH_before_swap = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .balance_of(caller_address);
    assert(balance_ETH_before_swap == 1000000, 'wrong balance ETH before swap');

    let balance_USDC_before_swap = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .balance_of(caller_address);
    assert(balance_USDC_before_swap == 1000000, 'wrong balance USDC before swap');

    start_cheat_caller_address(contract_address_const::<'ETH'>(), caller_address); //change to switch swap
    // Send token to order_vault in multicall with create_order
    IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() } //change to switch swap
        .transfer(order_vault.contract_address, 1);

    let balance_ETH_before = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .balance_of(caller_address);
    let balance_USDC_before = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .balance_of(caller_address);
    'balance ETH: '.print();
    balance_ETH_before.print();
    'balance USDC: '.print();
    balance_USDC_before.print();
    'end first balances'.print();
    // Create order_params Struct
    let contract_address = contract_address_const::<0>();
    start_cheat_caller_address(market.long_token, caller_address); //change to switch swap
    let order_params = CreateOrderParams {
        receiver: caller_address,
        callback_contract: contract_address,
        ui_fee_receiver: contract_address,
        market: contract_address,
        initial_collateral_token: market.long_token, //change to switch swap
        swap_path: Array32Trait::<ContractAddress>::span32(@array![market.market_token]),
        size_delta_usd: 1,
        initial_collateral_delta_amount: 1, // 10^18
        trigger_price: 0,
        acceptable_price: 0,
        execution_fee: 0,
        callback_gas_limit: 0,
        min_output_amount: 0,
        order_type: OrderType::MarketSwap(()),
        decrease_position_swap_type: DecreasePositionSwapType::NoSwap(()),
        is_long: false,
        referral_code: 0
    };
    // Create the swap order.
    start_cheat_block_number(order_handler.contract_address, 1920);
    let key = order_handler.create_order(caller_address, order_params);

    let got_order = data_store.get_order(key);
    // data_store.set_u256(keys::pool_amount_key(market.market_token, contract_address_const::<'USDC'>()), );
    // data_store.set_u256(keys::pool_amount_key(market.market_token, contract_address_const::<'ETH'>()), 1000000);
    // Execute the swap order.
    let signatures: Span<felt252> = array![0].span();
    let set_price_params = SetPricesParams {
        signer_info: 2,
        tokens: array![contract_address_const::<'ETH'>(), contract_address_const::<'USDC'>()],
        compacted_min_oracle_block_numbers: array![1910, 1910],
        compacted_max_oracle_block_numbers: array![1920, 1920],
        compacted_oracle_timestamps: array![9999, 9999],
        compacted_decimals: array![1, 1],
        compacted_min_prices: array![2147483648010000], // 500000, 10000 compacted
        compacted_min_prices_indexes: array![0],
        compacted_max_prices: array![2147483648010000], // 500000, 10000 compacted
        compacted_max_prices_indexes: array![0],
        signatures: array![
            array!['signatures1', 'signatures2'].span(), array!['signatures1', 'signatures2'].span()
        ],
        price_feed_tokens: array![]
    };

    let balance_ETH_before_execute = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .balance_of(caller_address);
    let balance_USDC_before_execute = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .balance_of(caller_address);

    'balance eth before execute'.print();
    balance_ETH_before_execute.print();
    // assert(balance_ETH_after == 999999, 'wrong balance ETH after swap');
    'balance usdc before execute'.print();
    balance_USDC_before_execute.print();

    let keeper_address = contract_address_const::<'keeper'>();
    role_store.grant_role(keeper_address, role::ORDER_KEEPER);

    stop_cheat_caller_address(order_handler.contract_address);
    start_cheat_caller_address(order_handler.contract_address, keeper_address);
    start_cheat_block_number(order_handler.contract_address, 1925);
    // TODO add real signatures check on Oracle Account
    order_handler.execute_order_keeper(key, set_price_params, keeper_address);

    let balance_ETH_after = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .balance_of(caller_address);
    let balance_USDC_after = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .balance_of(caller_address);

    'balance eth after'.print();
    balance_ETH_after.print();
    // assert(balance_ETH_after == 999999, 'wrong balance ETH after swap');
    'balance usdc after'.print();
    balance_USDC_after.print();
    // assert(balance_USDC_after == 995000, 'wrong balance USDC after swap');

    let first_swap_pool_value_info = market_utils::get_pool_value_info(
        data_store,
        market,
        Price {
            min: 5000,
            max: 5000,
        }
        ,
        Price {
            min: 5000,
            max: 5000,
        },
        Price {
            min: 1,
            max: 1,
        },
        keys::max_pnl_factor_for_deposits(),
        true,
    );

    first_swap_pool_value_info.pool_value.mag.print();
    first_swap_pool_value_info.long_token_amount.print();
    first_swap_pool_value_info.short_token_amount.print();
}
