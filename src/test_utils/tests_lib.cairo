// Core lib imports.
use core::traits::{TryInto, Into};
use debug::PrintTrait;
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
use freyr::market::{market::{UniqueIdMarketImpl},};
use freyr::mock::referral_storage::{IReferralStorageDispatcher, IReferralStorageDispatcherTrait};
use freyr::oracle::oracle::{IOracleDispatcher, IOracleDispatcherTrait};
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
use freyr::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use freyr::utils::span32::{Span32, DefaultSpan32, Array32Trait};
use freyr::withdrawal::withdrawal::Withdrawal;
use freyr::withdrawal::withdrawal_utils;
use freyr::withdrawal::withdrawal_vault::{IWithdrawalVaultDispatcher, IWithdrawalVaultDispatcherTrait};
use result::ResultTrait;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, start_cheat_block_number, ContractClassTrait,
    DeclareResultTrait, ContractClass
};
use starknet::{
    ContractAddress, get_caller_address, Felt252TryIntoContractAddress, contract_address_const, ClassHash,
    ClassHashIntoFelt252
};

// constants
const INITIAL_TOKENS_MINTED: felt252 = 1000;

// Not used in setup
fn declare_mock_account() -> @ContractClass {
    declare("MockAccount").unwrap().contract_class()
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
    let erc20_contract = declare("ERC20").unwrap().contract_class();
    let constructor_calldata3 = array!['freyr', 'STU', 18, INITIAL_TOKENS_MINTED, 0, deposit_vault_address.into()];
    let (contract_address, _) = erc20_contract.deploy(@constructor_calldata3).unwrap();
    contract_address
}

// Not used in setup
fn deploy_tokens() -> (ContractAddress, ContractAddress) {
    let caller_address: ContractAddress = get_c4ller_address();
    let contract = declare("ERC20").unwrap().contract_class();

    let eth_address = get_ETH_address();
    let constructor_calldata: Array<felt252> = array!['Ethereum', 'ETH', 18, 1000000, 0, caller_address.into()];
    // let constructor_calldata: Array<felt252> = array!['Ethereum', 'ETH', 10000000000000000000, 0,
    // caller_address.into()];
    contract.deploy_at(@constructor_calldata, eth_address).unwrap();

    let usdc_address = get_USDC_address();
    let constructor_calldata: Array<felt252> = array!['usdc', 'USDC', 18, 1000000, 0, caller_address.into()];
    // let constructor_calldata: Array<felt252> = array!['usdc', 'USDC', 100000000000000000000000, 0,
    // caller_address.into()];
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
) {
    let (
        caller_address,
        market_token_class,
        increase_order_class,
        decrease_order_class,
        swap_order_class,
        order_utils_class,
        role_module_class,
        bank_class,
        governable_class,
        market_utils_class,
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
    ) =
        setup_contracts();

    grant_roles();

    (
        caller_address,
        *market_token_class,
        *increase_order_class,
        *decrease_order_class,
        *swap_order_class,
        *order_utils_class,
        *role_module_class,
        *bank_class,
        *governable_class,
        *market_utils_class,
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
    @ContractClass,
    @ContractClass,
    @ContractClass,
    @ContractClass,
    @ContractClass,
    @ContractClass,
    @ContractClass,
    @ContractClass,
    @ContractClass,
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
) {
    let caller_address = get_c4ller_address();

    // Declare the `MarketToken` contract.
    let market_token_class = declare_market_token();

    // Declare the `RoleModule` contract
    let role_module_class = declare_role_module();

    // Declare the `Governable` contract
    let governable_class = declare_governable();

    // Declare utils
    let increase_order_class = declare_increase_order_utils();
    let decrease_order_class = declare_decrease_order_utils();
    let swap_order_class = declare_swap_order_utils();
    let order_utils_class = declare_order_utils();
    let base_order_handler_class = declare_base_order_handler();
    let market_utils_class = declare_market_utils();

    // Deploy reader
    let reader_address = deploy_reader(market_utils_class.class_hash);
    let reader = IReaderDispatcher { contract_address: reader_address };

    // Deploy event emitter
    let event_emitter_address = deploy_event_emitter();
    let event_emitter = IEventEmitterDispatcher { contract_address: event_emitter_address };

    // Deploy the role store contract.
    let role_store_address = deploy_role_store();
    let role_store = IRoleStoreDispatcher { contract_address: role_store_address };

    // Deploy the data store contract.
    let data_store_address = deploy_data_store(role_store_address, role_module_class.class_hash);
    let data_store = IDataStoreDispatcher { contract_address: data_store_address };

    // Deploy and initialize bank
    let (bank_address, bank_class) = deploy_bank();
    let bank = IBankDispatcher { contract_address: bank_address };
    bank.initialize(data_store_address, role_store_address, *role_module_class.class_hash);

    // Deploy and initialize strict bank
    let (strict_bank_address, strict_bank_class) = deploy_strict_bank();
    let strict_bank = IStrictBankDispatcher { contract_address: strict_bank_address };
    strict_bank
        .initialize(data_store_address, role_store_address, *bank_class.class_hash, *role_module_class.class_hash);

    // Deploy the router contract.
    let router_address = deploy_router(role_store_address, role_module_class.class_hash);

    // Deploy the market factory.
    let market_factory_address = deploy_market_factory(
        data_store_address,
        role_store_address,
        event_emitter_address,
        market_token_class.class_hash,
        bank_class.class_hash,
        role_module_class.class_hash
    );
    let market_factory = IMarketFactoryDispatcher { contract_address: market_factory_address };

    // Deploy mock data feed
    let pragma_address = deploy_price_feed();

    // Deploy the oracle
    let oracle_address = deploy_oracle(
        role_store_address, pragma_address, role_module_class.class_hash
    );
    let oracle = IOracleDispatcher { contract_address: oracle_address };

    // Deploy the deposit vault
    let deposit_vault_address = deploy_deposit_vault(
        role_store_address,
        data_store_address,
        strict_bank_class.class_hash,
        bank_class.class_hash,
        role_module_class.class_hash
    );
    let deposit_vault = IDepositVaultDispatcher { contract_address: deposit_vault_address };

    // Deploy the deposit handler
    let deposit_handler_address = deploy_deposit_handler(
        data_store_address,
        role_store_address,
        event_emitter_address,
        deposit_vault_address,
        oracle_address,
        role_module_class.class_hash,
        market_utils_class.class_hash,
    );
    let deposit_handler = IDepositHandlerDispatcher { contract_address: deposit_handler_address };

    // Deploy the withdrawal vault
    let withdrawal_vault_address = deploy_withdrawal_vault(
        data_store_address,
        role_store_address,
        strict_bank_class.class_hash,
        bank_class.class_hash,
        role_module_class.class_hash
    );
    let withdrawal_vault = IWithdrawalVaultDispatcher { contract_address: withdrawal_vault_address };

    // Deploy the withdrawal handler
    let withdrawal_handler_address = deploy_withdrawal_handler(
        data_store_address,
        role_store_address,
        event_emitter_address,
        withdrawal_vault_address,
        oracle_address,
        role_module_class.class_hash,
        market_utils_class.class_hash
    );
    let withdrawal_handler = IWithdrawalHandlerDispatcher { contract_address: withdrawal_handler_address };

    // Deply the order vault
    let order_vault_address = deploy_order_vault(
        data_store.contract_address,
        role_store.contract_address,
        strict_bank_class.class_hash,
        bank_class.class_hash,
        role_module_class.class_hash
    );
    let order_vault = IOrderVaultDispatcher { contract_address: order_vault_address };

    // Deploy te swap handler
    let swap_handler_address = deploy_swap_handler(
        role_store_address, role_module_class.class_hash, market_utils_class.class_hash
    );
    let swap_handler = ISwapHandlerDispatcher { contract_address: swap_handler_address };

    // Deploy the referral storage
    let referral_storage_address = deploy_referral_storage(event_emitter_address, governable_class.class_hash);
    let referral_storage = IReferralStorageDispatcher { contract_address: referral_storage_address };

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
        role_module_class.class_hash,
        base_order_handler_class.class_hash,
        market_utils_class.class_hash,
    );
    let order_handler = IOrderHandlerDispatcher { contract_address: order_handler_address };

    // Deploy exchange router
    let exchange_router_address = deploy_exchange_router(
        router_address,
        data_store_address,
        event_emitter_address,
        deposit_handler_address,
        withdrawal_handler_address,
        order_handler_address,
        market_utils_class.class_hash,
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
        role_module_class.class_hash,
        base_order_handler_class.class_hash,
        market_utils_class.class_hash,
    );
    let liquidation_handler = ILiquidationHandlerDispatcher { contract_address: liquidation_handler_address };

    (
        caller_address,
        market_token_class,
        increase_order_class,
        decrease_order_class,
        swap_order_class,
        order_utils_class,
        role_module_class,
        bank_class,
        governable_class,
        market_utils_class,
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
    )
}

fn declare_market_token() -> @ContractClass {
    declare("MarketToken").unwrap().contract_class()
}

fn declare_role_module() -> @ContractClass {
    declare("RoleModule").unwrap().contract_class()
}

fn declare_governable() -> @ContractClass {
    declare("Governable").unwrap().contract_class()
}

fn deploy_market_factory(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    market_token_class_hash: @ClassHash,
    bank_class_hash: @ClassHash,
    role_module_class_hash: @ClassHash
) -> ContractAddress {
    let contract = declare("MarketFactory").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_market_factory_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let mut constructor_calldata: Array<felt252> = array![];
    constructor_calldata.append(data_store_address.into());
    constructor_calldata.append(role_store_address.into());
    constructor_calldata.append(event_emitter_address.into());
    constructor_calldata.append((*market_token_class_hash).into());
    constructor_calldata.append((*bank_class_hash).into());
    constructor_calldata.append((*role_module_class_hash).into());
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_data_store(role_store_address: ContractAddress, role_module_class_hash: @ClassHash,) -> ContractAddress {
    let contract = declare("DataStore").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address: ContractAddress = get_data_store_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![role_store_address.into(), (*role_module_class_hash).into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_role_store() -> ContractAddress {
    let contract = declare("RoleStore").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_role_store_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@array![caller_address.into()], deployed_contract_address).unwrap();
    contract_address
}

fn deploy_event_emitter() -> ContractAddress {
    let contract = declare("EventEmitter").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_event_emitter_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@array![], deployed_contract_address).unwrap();
    contract_address
}

fn deploy_router(role_store_address: ContractAddress, role_module_class_hash: @ClassHash,) -> ContractAddress {
    let contract = declare("Router").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_router_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata = array![role_store_address.into(), (*role_module_class_hash).into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_deposit_handler(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    deposit_vault_address: ContractAddress,
    oracle_address: ContractAddress,
    role_module_class_hash: @ClassHash,
    market_utils_class_hash: @ClassHash,
) -> ContractAddress {
    let contract = declare("DepositHandler").unwrap().contract_class();
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
                oracle_address.into(),
                (*role_module_class_hash).into(),
                (*market_utils_class_hash).into(),
            ],
            deployed_contract_address
        )
        .unwrap();
    contract_address
}

fn deploy_oracle(
    role_store_address: ContractAddress,
    pragma_address: ContractAddress,
    role_module_class_hash: @ClassHash,
) -> ContractAddress {
    let contract = declare("Oracle").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_oracle_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract
        .deploy_at(
            @array![
                role_store_address.into(),
                pragma_address.into(),
                (*role_module_class_hash).into()
            ],
            deployed_contract_address
        )
        .unwrap();
    contract_address
}

fn deploy_deposit_vault(
    role_store_address: ContractAddress,
    data_store_address: ContractAddress,
    strict_bank_class_hash: @ClassHash,
    bank_class_hash: @ClassHash,
    role_module_class_hash: @ClassHash
) -> ContractAddress {
    let contract = declare("DepositVault").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_deposit_vault_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract
        .deploy_at(
            @array![
                data_store_address.into(),
                role_store_address.into(),
                (*strict_bank_class_hash).into(),
                (*bank_class_hash).into(),
                (*role_module_class_hash).into(),
            ],
            deployed_contract_address
        )
        .unwrap();
    contract_address
}

fn deploy_withdrawal_handler(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    withdrawal_vault_address: ContractAddress,
    oracle_address: ContractAddress,
    role_module_class_hash: @ClassHash,
    market_utils_class_hash: @ClassHash,
) -> ContractAddress {
    let contract = declare("WithdrawalHandler").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_withdrawal_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![
        data_store_address.into(),
        role_store_address.into(),
        event_emitter_address.into(),
        withdrawal_vault_address.into(),
        oracle_address.into(),
        (*role_module_class_hash).into(),
        (*market_utils_class_hash).into(),
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_withdrawal_vault(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    strict_bank_class_hash: @ClassHash,
    bank_class_hash: @ClassHash,
    role_module_class_hash: @ClassHash
) -> ContractAddress {
    let contract = declare("WithdrawalVault").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_withdrawal_vault_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![
        data_store_address.into(),
        role_store_address.into(),
        (*strict_bank_class_hash).into(),
        (*bank_class_hash).into(),
        (*role_module_class_hash).into(),
    ];
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
    order_utils_class: @ClassHash,
    increase_order_class: @ClassHash,
    decrease_order_class: @ClassHash,
    swap_order_class: @ClassHash,
    role_module_class_hash: @ClassHash,
    base_order_handler_class_hash: @ClassHash,
    market_utils_class_hash: @ClassHash,
) -> ContractAddress {
    let contract = declare("OrderHandler").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_order_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![
        data_store_address.into(),
        role_store_address.into(),
        event_emitter_address.into(),
        order_vault_address.into(),
        oracle_address.into(),
        swap_handler_address.into(),
        referral_storage_address.into(),
        (*order_utils_class).into(),
        (*increase_order_class).into(),
        (*decrease_order_class).into(),
        (*swap_order_class).into(),
        (*role_module_class_hash).into(),
        (*base_order_handler_class_hash).into(),
        (*market_utils_class_hash).into(),
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
    order_utils_class: @ClassHash,
    increase_order_class: @ClassHash,
    decrease_order_class: @ClassHash,
    swap_order_class: @ClassHash,
    role_module_class_hash: @ClassHash,
    base_order_handler_class_hash: @ClassHash,
    market_utils_class_hash: @ClassHash,
) -> ContractAddress {
    let contract = declare("LiquidationHandler").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_liquidation_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![
        data_store_address.into(),
        role_store_address.into(),
        event_emitter_address.into(),
        order_vault_address.into(),
        oracle_address.into(),
        swap_handler_address.into(),
        referral_storage_address.into(),
        (*order_utils_class).into(),
        (*increase_order_class).into(),
        (*decrease_order_class).into(),
        (*swap_order_class).into(),
        (*role_module_class_hash).into(),
        (*base_order_handler_class_hash).into(),
        (*market_utils_class_hash).into(),
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_swap_handler(
    role_store_address: ContractAddress, role_module_class_hash: @ClassHash, market_utils_class_hash: @ClassHash
) -> ContractAddress {
    let contract = declare("SwapHandler").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_swap_handler_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![
        role_store_address.into(), (*role_module_class_hash).into(), (*market_utils_class_hash).into()
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_referral_storage(
    event_emitter_address: ContractAddress, governable_class_hash: @ClassHash
) -> ContractAddress {
    let contract = declare("ReferralStorage").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_referral_storage_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![event_emitter_address.into(), (*governable_class_hash).into()];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_exchange_router(
    router_address: ContractAddress,
    data_store_address: ContractAddress,
    event_emitter_address: ContractAddress,
    deposit_handler_address: ContractAddress,
    withdrawal_handler_address: ContractAddress,
    order_handler_address: ContractAddress,
    market_utils_class_hash: @ClassHash,
) -> ContractAddress {
    let contract = declare("ExchangeRouter").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_exchange_router_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let constructor_calldata: Array<felt252> = array![
        router_address.into(),
        data_store_address.into(),
        event_emitter_address.into(),
        deposit_handler_address.into(),
        withdrawal_handler_address.into(),
        order_handler_address.into(),
        (*market_utils_class_hash).into(),
    ];
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn deploy_order_vault(
    data_store_address: ContractAddress,
    role_store_address: ContractAddress,
    strict_bank_class_hash: @ClassHash,
    bank_class_hash: @ClassHash,
    role_module_class_hash: @ClassHash
) -> ContractAddress {
    let contract = declare("OrderVault").unwrap().contract_class();
    let caller_address: ContractAddress = get_c4ller_address();
    let deployed_contract_address = get_order_vault_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let mut constructor_calldata: Array<felt252> = array![];
    constructor_calldata.append(data_store_address.into());
    constructor_calldata.append(role_store_address.into());
    constructor_calldata.append((*strict_bank_class_hash).into());
    constructor_calldata.append((*bank_class_hash).into());
    constructor_calldata.append((*role_module_class_hash).into());

    let (contract_address, _) = contract.deploy_at(@constructor_calldata, deployed_contract_address).unwrap();
    contract_address
}

fn declare_increase_order_utils() -> @ContractClass {
    declare("IncreaseOrderUtils").unwrap().contract_class()
}

fn declare_decrease_order_utils() -> @ContractClass {
    declare("DecreaseOrderUtils").unwrap().contract_class()
}

fn declare_swap_order_utils() -> @ContractClass {
    declare("SwapOrderUtils").unwrap().contract_class()
}

fn declare_order_utils() -> @ContractClass {
    declare("OrderUtils").unwrap().contract_class()
}

fn declare_base_order_handler() -> @ContractClass {
    declare("BaseOrderHandler").unwrap().contract_class()
}

fn declare_market_utils() -> @ContractClass {
    declare("MarketUtils").unwrap().contract_class()
}

fn deploy_bank() -> (ContractAddress, @ContractClass) {
    let caller_address: ContractAddress = get_c4ller_address();
    let bank_address: ContractAddress = get_bank_address();
    let contract = declare("Bank").unwrap().contract_class();
    start_cheat_caller_address(bank_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@array![], bank_address).unwrap();
    (contract_address, contract)
}

fn deploy_strict_bank() -> (ContractAddress, @ContractClass) {
    let caller_address: ContractAddress = get_c4ller_address();
    let strict_bank_address: ContractAddress = get_strict_bank_address();
    let contract = declare("StrictBank").unwrap().contract_class();
    start_cheat_caller_address(strict_bank_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@array![], strict_bank_address).unwrap();
    (contract_address, contract)
}

fn deploy_reader(market_utils_class_hash: @ClassHash) -> ContractAddress {
    let caller_address: ContractAddress = get_c4ller_address();
    let reader_address: ContractAddress = get_reader_address();
    let contract = declare("Reader").unwrap().contract_class();
    let mut constructor_calldata: Array<felt252> = array![(*market_utils_class_hash).into()];
    start_cheat_caller_address(reader_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@constructor_calldata, reader_address).unwrap();
    contract_address
}

fn deploy_price_feed() -> ContractAddress {
    let caller_address: ContractAddress = get_c4ller_address();
    let contract = declare("PriceFeed").unwrap().contract_class();
    let deployed_contract_address: ContractAddress = get_pragma_address();
    start_cheat_caller_address(deployed_contract_address, caller_address);
    let (contract_address, _) = contract.deploy_at(@array![], deployed_contract_address).unwrap();
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
