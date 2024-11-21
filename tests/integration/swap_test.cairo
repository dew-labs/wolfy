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
use freyr::test_utils::deposit_setup::deposit_setup;
use freyr::test_utils::tests_lib;
use freyr::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use freyr::utils::span32::{Span32, DefaultSpan32, Array32Trait};
use freyr::withdrawal::withdrawal::Withdrawal;
use freyr::withdrawal::withdrawal_utils;
use freyr::withdrawal::withdrawal_vault::{IWithdrawalVaultDispatcher, IWithdrawalVaultDispatcherTrait};
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number, ContractClassTrait,
    DeclareResultTrait, ContractClass
};
use starknet::{ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash,};
use traits::{TryInto, Into};
const INITIAL_TOKENS_MINTED: felt252 = 1000;

#[test]
fn test_swap_market() {
    let (
        caller_address,
        _market_token_class,
        _market_factory,
        role_store,
        data_store,
        _event_emitter,
        _exchange_router,
        _deposit_handler,
        _deposit_vault,
        _oracle,
        order_handler,
        order_vault,
        _reader,
        _referal_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        market,
    ) =
        deposit_setup(
        20000000000000000000, 100000000000000000000000
    );

    let ETH = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() };
    let USDC = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() };

    let long_token = IERC20Dispatcher { contract_address: market.long_token };
    let short_token = IERC20Dispatcher { contract_address: market.short_token };

    let balance_caller_ETH = long_token.balance_of(caller_address);
    let balance_caller_USDC = short_token.balance_of(caller_address);

    assert(balance_caller_ETH == 10000000000000000000, 'balanc ETH should be 10 ETH');
    assert(balance_caller_USDC == 50000000000000000000000, 'USDC be 50 000 USDC');

    let pool_value_info = market_utils::get_pool_value_info(
        data_store,
        market,
        Price { min: 5000, max: 5000, },
        Price { min: 5000, max: 5000, },
        Price { min: 1, max: 1, },
        keys::max_pnl_factor_for_deposits(),
        true,
    );

    // 200 000 USD
    assert(pool_value_info.pool_value.mag == 200000000000000000000000, 'wrong pool_value balance');
    // 20 ETH
    assert(pool_value_info.long_token_amount == 20000000000000000000, 'wrong long_token balance');
    // 100 000 USDC
    assert(pool_value_info.short_token_amount == 100000000000000000000000, 'wrong short_token balance');

    // // --------------------------------------------------SWAP TEST ETH->USDC
    // --------------------------------------------------
    'Swap ETH to USDC'.print();

    let balance_ETH_before_swap = ETH.balance_of(caller_address);
    let balance_USDC_before_swap = USDC.balance_of(caller_address);

    // 10 ETH
    assert(balance_ETH_before_swap == 10000000000000000000, 'wrong balance ETH before swap');
    // 50 000 USDC
    assert(balance_USDC_before_swap == 50000000000000000000000, 'wrong balance USDC before swap');

    start_cheat_caller_address(contract_address_const::<'ETH'>(), caller_address); // change to switch swap

    // Send token to order_vault in multicall with create_order
    'Transfer'.print();

    IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() } // change to switch swap
        .transfer(order_vault.contract_address, 1000000000000000000);

    'Transfered'.print();

    let balance_ETH_before = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .balance_of(caller_address);

    let balance_USDC_before = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .balance_of(caller_address);

    // Balance caller address after sending 1 ETH to the vault
    // 9 ETH
    assert(balance_ETH_before == 9000000000000000000, 'wrng ETH blce after vlt');
    // 50 000 USDC
    assert(balance_USDC_before == 50000000000000000000000, 'wrng USDC blce after vlt');

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
        size_delta_usd: 1000000000000000000,
        initial_collateral_delta_amount: 1000000000000000000, // 10^18
        trigger_price: 0,
        acceptable_price: 4999,
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

    'Create order'.print();
    // Create the order but we do not execute it yet
    let key = order_handler.create_order(caller_address, order_params);
    'Created'.print();

    let _got_order = data_store.get_order(key);

    // Execute the swap order.
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
        compacted_max_prices: array![5000, 1], // 500000, 10000 compacted
        compacted_max_prices_indexes: array![0],
        signatures: array![array!['signatures1', 'signatures2'].span(), array!['signatures1', 'signatures2'].span()],
        price_feed_tokens: array![]
    };

    let balance_ETH_before_execute = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .balance_of(caller_address);
    let balance_USDC_before_execute = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .balance_of(caller_address);

    // 9 ETH
    assert(balance_ETH_before_execute == 9000000000000000000, 'wrng ETH blce bef execute');
    // 50 000 USDC
    assert(balance_USDC_before_execute == 50000000000000000000000, 'wrng USDC blce bef execute');

    let keeper_address = contract_address_const::<'keeper'>();
    role_store.grant_role(keeper_address, role::ORDER_KEEPER);

    stop_cheat_caller_address(order_handler.contract_address);
    start_cheat_caller_address(order_handler.contract_address, keeper_address);
    start_cheat_block_number(order_handler.contract_address, 1925);

    'Execute order'.print();
    order_handler.execute_order(key, set_price_params);
    'Executed'.print();

    let balance_ETH_after = IERC20Dispatcher { contract_address: contract_address_const::<'ETH'>() }
        .balance_of(caller_address);

    let balance_USDC_after = IERC20Dispatcher { contract_address: contract_address_const::<'USDC'>() }
        .balance_of(caller_address);

    // 9 ETH
    assert(balance_ETH_after == 9000000000000000000, 'wrng ETH blce after exec');
    // 55 000 USDC
    assert(balance_USDC_after == 55000000000000000000000, 'wrng USDC blce after exec');

    let first_swap_pool_value_info = market_utils::get_pool_value_info(
        data_store,
        market,
        Price { min: 5000, max: 5000, },
        Price { min: 5000, max: 5000, },
        Price { min: 1, max: 1, },
        keys::max_pnl_factor_for_deposits(),
        true,
    );

    // 200 000 USD
    assert(first_swap_pool_value_info.pool_value.mag == 200000000000000000000000, 'wrong pool_value balance');
    // 21 ETH
    assert(first_swap_pool_value_info.long_token_amount == 21000000000000000000, 'wrong long_token balance');
    // 95 000 USDC
    assert(first_swap_pool_value_info.short_token_amount == 95000000000000000000000, 'wrong short_token balance');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}
