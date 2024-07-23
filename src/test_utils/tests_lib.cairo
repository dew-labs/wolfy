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
use satoru::order::order_utils::{IOrderUtilsDispatcher, IOrderUtilsDispatcherTrait};
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
use satoru::exchange::liquidation_handler::{ILiquidationHandlerDispatcher, ILiquidationHandlerDispatcherTrait};
use satoru::order::order::{Order, OrderType, SecondaryOrderType, DecreasePositionSwapType};
use satoru::order::order_vault::{IOrderVaultDispatcher, IOrderVaultDispatcherTrait};
use satoru::order::base_order_utils::{CreateOrderParams};
use satoru::oracle::oracle_store::{IOracleStoreDispatcher, IOracleStoreDispatcherTrait};
use satoru::swap::swap_handler::{ISwapHandlerDispatcher, ISwapHandlerDispatcherTrait};
use satoru::market::{market::{UniqueIdMarketImpl},};
use satoru::exchange::order_handler::{OrderHandler, IOrderHandlerDispatcher, IOrderHandlerDispatcherTrait};

// constants
const INITIAL_TOKENS_MINTED: felt252 = 1000;

// Not used in setup
fn declare_mock_account() -> ContractClass {
    declare("MockAccount").unwrap()
}

// Not used in setup
fn deploy_mock_account() -> ContractAddress {
    let (contract_address, _) = declare_mock_account().deploy(@array![]).unwrap();
    contract_address
}

// Not used in setup
fn deploy_mock_account_at(mock_account_contract: ContractClass, address: ContractAddress) -> ContractAddress {
    let (contract_address, _) = mock_account_contract.deploy_at(@array![], address).unwrap();
    contract_address
}

// Not used in setup
fn deploy_erc20_token(deposit_vault_address: ContractAddress) -> ContractAddress {
    let erc20_contract = declare("ERC20").unwrap();
    let constructor_calldata3 = array!['satoru', 'STU', INITIAL_TOKENS_MINTED, 0, deposit_vault_address.into()];
    let (contract_address, _) = erc20_contract.deploy(@constructor_calldata3).unwrap();
    contract_address
}

// Not used in setup
fn deploy_tokens() -> (ContractAddress, ContractAddress) {
    let caller_address: ContractAddress = get_c4ller_address();
    let contract = declare("ERC20").unwrap();

    let eth_address = get_ETH_address();
    let constructor_calldata = array!['Ethereum', 'ETH', 1000000, 0, caller_address.into()];
    // let constructor_calldata = array!['Ethereum', 'ETH', 10000000000000000000, 0, caller_address.into()];
    contract.deploy_at(@constructor_calldata, eth_address).unwrap();

    let usdc_address = get_USDC_address();
    let constructor_calldata = array!['usdc', 'USDC', 1000000, 0, caller_address.into()];
    // let constructor_calldata = array!['usdc', 'USDC', 100000000000000000000000, 0, caller_address.into()];
    contract.deploy_at(@constructor_calldata, usdc_address).unwrap();
    (eth_address, usdc_address)
}

// Not used in setup
fn create_market(market_factory: IMarketFactoryDispatcher) -> ContractAddress {
    // Create a market.
    let (index_token, short_token) = deploy_tokens();
    let market_type = 'market_type';

    // Index token is the same as long token here.
    market_factory.create_market(index_token, index_token, short_token, market_type)
}

/// Utility function to setup the test environment.
fn setup() -> (
    // This caller address will be used with `start_cheat_caller_address` cheatcode to mock the caller address.,
    ContractAddress,
    ContractClass,
    ContractClass,
    ContractClass,
    ContractClass,
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
    ISwapHandlerDispatcher,
    IBankDispatcher,
    IStrictBankDispatcher,
    IOracleStoreDispatcher,
) {
    let (
        caller_address,
        market_token_class,
        increase_order_class,
        decrease_order_class,
        swap_order_class,
        order_utils_class,
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
        referral_storage,
        withdrawal_handler,
        withdrawal_vault,
        liquidation_handler,
        swap_handler,
        bank,
        strict_bank,
        oracle_store,
    ) = setup_contracts();

    grant_roles();

    (
        caller_address,
        market_token_class,
        increase_order_class,
        decrease_order_class,
        swap_order_class,
        order_utils_class,
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
        referral_storage,
        withdrawal_handler,
        withdrawal_vault,
        liquidation_handler,
        swap_handler,
        bank,
        strict_bank,
        oracle_store,
    )
}

// Utility function to grant roles and prank the caller address.
fn grant_roles() {
    let caller_address = get_c4ller_address();

    let role_store = IRoleStoreDispatcher { contract_address: get_role_store_address() };

    role_store.grant_role(caller_address, role::CONTROLLER);
    role_store.grant_role(caller_address, role::MARKET_KEEPER);
}

/// Utility function to teardown the test environment.
fn teardown() {
    stop_cheat_caller_address(get_role_store_address());
    stop_cheat_caller_address(get_data_store_address());
    stop_cheat_caller_address(get_market_factory_address());
    stop_cheat_caller_address(get_swap_handler_address());
    stop_cheat_caller_address(get_bank_address());
    stop_cheat_caller_address(get_strict_bank_address());
    stop_cheat_caller_address(get_event_emitter_address());
    stop_cheat_caller_address(get_oracle_store_address());
    stop_cheat_caller_address(get_router_address());
    stop_cheat_caller_address(get_deposit_handler_address());
    stop_cheat_caller_address(get_oracle_address());
    stop_cheat_caller_address(get_deposit_vault_address());
    stop_cheat_caller_address(get_withdrawal_handler_address());
    stop_cheat_caller_address(get_withdrawal_vault_address());
    stop_cheat_caller_address(get_order_handler_address());
    stop_cheat_caller_address(get_liquidation_handler_address());
    stop_cheat_caller_address(get_referral_storage_address());
    stop_cheat_caller_address(get_exchange_router_address());
    stop_cheat_caller_address(get_order_vault_address());
    stop_cheat_caller_address(get_reader_address());
}

/// Setup required contracts.
fn setup_contracts() -> (
    // This caller address will be used with `start_cheat_caller_address` cheatcode to mock the caller address.,
    ContractAddress,
    ContractClass,
    ContractClass,
    ContractClass,
    ContractClass,
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
    ISwapHandlerDispatcher,
    IBankDispatcher,
    IStrictBankDispatcher,
    IOracleStoreDispatcher,
) {
    let caller_address = get_c4ller_address();

    // Declare the `MarketToken` contract.
    let market_token_class = declare_market_token();

    // Deploy reader
    let reader_address = deploy_reader();
    let reader = IReaderDispatcher { contract_address: reader_address };

    // Deploy event emitter
    let event_emitter_address = deploy_event_emitter();
    let event_emitter = IEventEmitterDispatcher { contract_address: event_emitter_address };

    // Deploy the role store contract.
    let role_store_address = deploy_role_store();
    let role_store = IRoleStoreDispatcher { contract_address: role_store_address };

    // Deploy the contract.
    let data_store_address = deploy_data_store(role_store_address);
    let data_store = IDataStoreDispatcher { contract_address: data_store_address };

    // Deploy bank
    let bank_address = deploy_bank(data_store_address, role_store_address);
    let bank = IBankDispatcher { contract_address: bank_address };

    // Deploy strict bank
    let strict_bank_address = deploy_strict_bank(data_store_address, role_store_address);
    let strict_bank = IStrictBankDispatcher { contract_address: strict_bank_address };

    // Deploy the router contract.
    let router_address = deploy_router(role_store_address);

    // Deploy the market factory.
    let market_factory_address = deploy_market_factory(
        data_store_address, role_store_address, event_emitter_address, market_token_class.class_hash
    );
    let market_factory = IMarketFactoryDispatcher { contract_address: market_factory_address };

    // Deploy the oracle store
    let oracle_store_address = deploy_oracle_store(role_store_address, event_emitter_address);
    let oracle_store = IOracleStoreDispatcher { contract_address: oracle_store_address };

    // Deploy the oracle
    let oracle_address = deploy_oracle(role_store_address, oracle_store_address, get_pragma_address());
    let oracle = IOracleDispatcher { contract_address: oracle_address };

    // Deploy the deposit vault
    let deposit_vault_address = deploy_deposit_vault(role_store_address, data_store_address);
    let deposit_vault = IDepositVaultDispatcher { contract_address: deposit_vault_address };

    // Deploy the deposit handler
    let deposit_handler_address = deploy_deposit_handler(
        data_store_address, role_store_address, event_emitter_address, deposit_vault_address, oracle_address
    );
    let deposit_handler = IDepositHandlerDispatcher { contract_address: deposit_handler_address };

    // Deploy the withdrawal vault
    let withdrawal_vault_address = deploy_withdrawal_vault(data_store_address, role_store_address);
    let withdrawal_vault = IWithdrawalVaultDispatcher { contract_address: withdrawal_vault_address };

    // Deploy the withdrawal handler
    let withdrawal_handler_address = deploy_withdrawal_handler(
        data_store_address, role_store_address, event_emitter_address, withdrawal_vault_address, oracle_address
    );
    let withdrawal_handler = IWithdrawalHandlerDispatcher { contract_address: withdrawal_handler_address };

    // Deply the order vault
    let order_vault_address = deploy_order_vault(data_store.contract_address, role_store.contract_address);
    let order_vault = IOrderVaultDispatcher { contract_address: order_vault_address };

    // Deploy te swap handler
    let swap_handler_address = deploy_swap_handler(role_store_address, data_store_address);
    let swap_handler = ISwapHandlerDispatcher { contract_address: swap_handler_address };

    // Deploy the referral storage
    let referral_storage_address = deploy_referral_storage(event_emitter_address);
    let referral_storage = IReferralStorageDispatcher { contract_address: referral_storage_address };

    // Declare utils
    let increase_order_class = declare_increase_order_utils();
    let decrease_order_class = declare_decrease_order_utils();
    let swap_order_class = declare_swap_order_utils();
    let order_utils_class = declare_order_utils();

    // Deploy order handler
    let order_handler_address = deploy_order_handler(
        data_store_address,
        role_store_address,
        event_emitter_address,
        order_vault_address,
        oracle_address,
        swap_handler_address,
        referral_storage_address,
        order_utils_class.class_hash,
        increase_order_class.class_hash,
        decrease_order_class.class_hash,
        swap_order_class.class_hash,
    );
    let order_handler = IOrderHandlerDispatcher { contract_address: order_handler_address };

    // Deploy exchange router
    let exchange_router_address = deploy_exchange_router(
        router_address,
        data_store_address,
        role_store_address,
        event_emitter_address,
        deposit_handler_address,
        withdrawal_handler_address,
        order_handler_address
    );
    let exchange_router = IExchangeRouterDispatcher { contract_address: exchange_router_address };

    // Deploy liquidation handler
    let liquidation_handler_address = deploy_liquidation_handler(
        data_store_address,
        role_store_address,
        event_emitter_address,
        order_vault_address,
        oracle_address,
        swap_handler_address,
        referral_storage_address,
        order_utils_class.class_hash,
        increase_order_class.class_hash,
        decrease_order_class.class_hash,
        swap_order_class.class_hash,
    );
    let liquidation_handler = ILiquidationHandlerDispatcher { contract_address: liquidation_handler_address };

    (
        caller_address,
        market_token_class,
        increase_order_class,
        decrease_order_class,
        swap_order_class,
        order_utils_class,
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
        referral_storage,
        withdrawal_handler,
        withdrawal_vault,
        liquidation_handler,
        swap_handler,
        bank,
        strict_bank,
        oracle_store,
    )
}

fn declare_market_token() -> ContractClass {
    declare("MarketToken").unwrap()
}

fn deploy_market_factory(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    market_token_class_hash: ClassHash,
) -> ContractAddress {
    let contract = declare("MarketFactory").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_market_factory_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let mut constructor_calldata = array![];
    constructor_calldata.append(data_store_address.into());
    constructor_calldata.append(role_store_address.into());
    constructor_calldata.append(event_emitter_address.into());
    constructor_calldata.append(market_token_class_hash.into());
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_data_store(role_store_address: ContractAddress) -> ContractAddress {
    let contract = declare("DataStore").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address: ContractAddress = get_data_store_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![role_store_address.into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_role_store() -> ContractAddress {
    let contract = declare("RoleStore").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_role_store_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@array![caller_address.into()], deployed_contract_address).unwrap();
    contract_address
}

fn deploy_event_emitter() -> ContractAddress {
    let contract = declare("EventEmitter").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_event_emitter_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@array![], deployed_contract_address).unwrap();
    contract_address
}

fn deploy_router(role_store_address: ContractAddress) -> ContractAddress {
    let contract = declare("Router").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_router_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![role_store_address.into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_deposit_handler(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    deposit_vault_address: ContractAddress,
    oracle_address: ContractAddress
) -> ContractAddress {
    let contract = declare("DepositHandler").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_deposit_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract
        .deploy_at(
            @array![
                data_store_address.into(),
                role_store_address.into(),
                event_emitter_address.into(),
                deposit_vault_address.into(),
                oracle_address.into()
            ],
            deployed_contract_address
        )
        .unwrap();
    contract_address
}

fn deploy_oracle_store(
    role_store_address: ContractAddress, event_emitter_address: ContractAddress,
) -> ContractAddress {
    let contract = declare("OracleStore").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_oracle_store_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract
        .deploy_at(@array![role_store_address.into(), event_emitter_address.into()], deployed_contract_address)
        .unwrap();
    contract_address
}

fn deploy_oracle(
    role_store_address: ContractAddress, oracle_store_address: ContractAddress, pragma_address: ContractAddress
) -> ContractAddress {
    let contract = declare("Oracle").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_oracle_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract
        .deploy_at(
            @array![role_store_address.into(), oracle_store_address.into(), pragma_address.into()],
            deployed_contract_address
        )
        .unwrap();
    contract_address
}

fn deploy_deposit_vault(role_store_address: ContractAddress, data_store_address: ContractAddress) -> ContractAddress {
    let contract = declare("DepositVault").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_deposit_vault_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract
        .deploy_at(@array![data_store_address.into(), role_store_address.into()], deployed_contract_address)
        .unwrap();
    contract_address
}

fn deploy_withdrawal_handler(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    withdrawal_vault_address: ContractAddress,
    oracle_address: ContractAddress
) -> ContractAddress {
    let contract = declare("WithdrawalHandler").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_withdrawal_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![
        data_store_address.into(),
        role_store_address.into(),
        event_emitter_address.into(),
        withdrawal_vault_address.into(),
        oracle_address.into()
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_withdrawal_vault(
    data_store_address: ContractAddress, role_store_address: ContractAddress
) -> ContractAddress {
    let contract = declare("WithdrawalVault").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_withdrawal_vault_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![data_store_address.into(), role_store_address.into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_order_handler(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    order_vault_address: ContractAddress,
    oracle_address: ContractAddress,
    swap_handler_address: ContractAddress,
    referral_storage_address: ContractAddress,
    order_utils_class: ClassHash,
    increase_order_class: ClassHash,
    decrease_order_class: ClassHash,
    swap_order_class: ClassHash
) -> ContractAddress {
    let contract = declare("OrderHandler").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_order_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![
        data_store_address.into(),
        role_store_address.into(),
        event_emitter_address.into(),
        order_vault_address.into(),
        oracle_address.into(),
        swap_handler_address.into(),
        referral_storage_address.into(),
        order_utils_class.into(),
        increase_order_class.into(),
        decrease_order_class.into(),
        swap_order_class.into()
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_liquidation_handler(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    order_vault_address: ContractAddress,
    oracle_address: ContractAddress,
    swap_handler_address: ContractAddress,
    referral_storage_address: ContractAddress,
    order_utils_class: ClassHash,
    increase_order_class: ClassHash,
    decrease_order_class: ClassHash,
    swap_order_class: ClassHash
) -> ContractAddress {
    let contract = declare("LiquidationHandler").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_liquidation_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![
        data_store_address.into(),
        role_store_address.into(),
        event_emitter_address.into(),
        order_vault_address.into(),
        oracle_address.into(),
        swap_handler_address.into(),
        referral_storage_address.into(),
        order_utils_class.into(),
        increase_order_class.into(),
        decrease_order_class.into(),
        swap_order_class.into()
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_swap_handler(
    role_store_address: ContractAddress, data_store_address: ContractAddress
) -> ContractAddress {
    let contract = declare("SwapHandler").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_swap_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![role_store_address.into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_referral_storage(event_emitter_address: ContractAddress) -> ContractAddress {
    let contract = declare("ReferralStorage").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_referral_storage_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![event_emitter_address.into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_exchange_router(
    router_address: ContractAddress,
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    deposit_handler_address: ContractAddress,
    withdrawal_handler_address: ContractAddress,
    order_handler_address: ContractAddress
) -> ContractAddress {
    let contract = declare("ExchangeRouter").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_exchange_router_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![
        router_address.into(),
        data_store_address.into(),
        role_store_address.into(),
        event_emitter_address.into(),
        deposit_handler_address.into(),
        withdrawal_handler_address.into(),
        order_handler_address.into()
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_order_vault(data_store_address: ContractAddress, role_store_address: ContractAddress,) -> ContractAddress {
    let contract = declare("OrderVault").unwrap();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_order_vault_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let mut constructor_calldata = array![];
    constructor_calldata.append(data_store_address.into());
    constructor_calldata.append(role_store_address.into());
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn declare_increase_order_utils() -> ContractClass {
    declare("IncreaseOrderUtils").unwrap()
}
fn declare_decrease_order_utils() -> ContractClass {
    declare("DecreaseOrderUtils").unwrap()
}
fn declare_swap_order_utils() -> ContractClass {
    declare("SwapOrderUtils").unwrap()
}


fn declare_order_utils() -> ContractClass {
    declare("OrderUtils").unwrap()
}

fn deploy_bank(data_store_address: ContractAddress, role_store_address: ContractAddress,) -> ContractAddress {
    let caller_address: ContractAddress = get_c4ller_address();
    let bank_address: ContractAddress = get_bank_address();
    let contract = declare("Bank").unwrap();
    let mut constructor_calldata = array![];
    constructor_calldata.append(data_store_address.into());
    constructor_calldata.append(role_store_address.into());
    start_cheat_caller_address(bank_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, bank_address).unwrap();
    contract_address
}

fn deploy_strict_bank(data_store_address: ContractAddress, role_store_address: ContractAddress,) -> ContractAddress {
    let caller_address: ContractAddress = get_c4ller_address();
    let strict_bank_address: ContractAddress = get_strict_bank_address();
    let contract = declare("StrictBank").unwrap();
    let mut constructor_calldata = array![];
    constructor_calldata.append(data_store_address.into());
    constructor_calldata.append(role_store_address.into());
    start_cheat_caller_address(strict_bank_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, strict_bank_address).unwrap();
    contract_address
}

fn deploy_reader() -> ContractAddress {
    let caller_address: ContractAddress = get_c4ller_address();
    let reader_address: ContractAddress = get_reader_address();
    let contract = declare("Reader").unwrap();
    let mut constructor_calldata = array![];
    start_cheat_caller_address(reader_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, reader_address).unwrap();
    contract_address
}

//------------------------------------------------------------------------------

fn get_strict_bank_address() -> ContractAddress {
    contract_address_const::<'strict_bank'>()
}

fn get_bank_address() -> ContractAddress {
    contract_address_const::<'bank'>()
}

fn get_order_vault_address() -> ContractAddress {
    contract_address_const::<'order_vault'>()
}

fn get_exchange_router_address() -> ContractAddress {
    contract_address_const::<'exchange_router'>()
}

fn get_referral_storage_address() -> ContractAddress {
    contract_address_const::<'referral_storage'>()
}

fn get_swap_handler_address() -> ContractAddress {
    contract_address_const::<'swap_handler'>()
}

fn get_liquidation_handler_address() -> ContractAddress {
    contract_address_const::<'liquidation_handler'>()
}

fn get_order_handler_address() -> ContractAddress {
    contract_address_const::<'order_handler'>()
}

fn get_withdrawal_vault_address() -> ContractAddress {
    contract_address_const::<'withdrawal_vault'>()
}

fn get_withdrawal_handler_address() -> ContractAddress {
    contract_address_const::<'withdrawal_handler'>()
}

fn get_deposit_vault_address() -> ContractAddress {
    contract_address_const::<'deposit_vault'>()
}

fn get_c4ller_address() -> ContractAddress {
    contract_address_const::<'caller'>()
}

fn get_reader_address() -> ContractAddress {
    contract_address_const::<'reader'>()
}

fn get_data_store_address() -> ContractAddress {
    contract_address_const::<'data_store'>()
}

fn get_role_store_address() -> ContractAddress {
    contract_address_const::<'role_store'>()
}

fn get_event_emitter_address() -> ContractAddress {
    contract_address_const::<'event_emitter'>()
}

fn get_router_address() -> ContractAddress {
    contract_address_const::<'router'>()
}

fn get_deposit_handler_address() -> ContractAddress {
    contract_address_const::<'deposit_handler'>()
}

fn get_oracle_store_address() -> ContractAddress {
    contract_address_const::<'oracle_store'>()
}

fn get_oracle_address() -> ContractAddress {
    contract_address_const::<'oracle'>()
}

fn get_market_factory_address() -> ContractAddress {
    contract_address_const::<'market_factory'>()
}

fn get_pragma_address() -> ContractAddress {
    contract_address_const::<'pragma'>()
}

fn get_USDC_address() -> ContractAddress {
    contract_address_const::<'USDC'>()
}

fn get_ETH_address() -> ContractAddress {
    contract_address_const::<'ETH'>()
}
