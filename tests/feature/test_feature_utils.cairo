use freyr::data::data_store::{IDataStoreDispatcher, IDataStoreDispatcherTrait};
use freyr::feature::feature_utils::{is_feature_disabled, validate_feature};
use freyr::test_utils::tests_lib;
use snforge_std::{
    declare, start_cheat_caller_address, stop_cheat_caller_address, ContractClassTrait, DeclareResultTrait
};
use starknet::ContractAddress;

#[test]
fn given_normal_conditions_when_nonexist_feature_then_works() {
    let data_store = setup();

    // Returns false because feature does not exist so cannot be disabled.
    let nonexist_feature = is_feature_disabled(data_store, 'NONEXIST_FEATURE');
    assert(!nonexist_feature, 'Nonexist feature wrong');
}

#[test]
fn given_normal_conditions_when_exist_disable_feature_then_works() {
    let data_store = setup();

    data_store.set_bool('EXIST_FEATURE', true);

    // Returns true because feature is disabled
    let exist_feature = is_feature_disabled(data_store, 'EXIST_FEATURE');
    assert(exist_feature, 'Exist feature wrong');
}

#[test]
fn given_normal_conditions_when_nonexist_feature_validate_then_works() {
    let data_store = setup();

    // Should not revert because feature does not exist
    validate_feature(data_store, 'NONEXIST_FEATURE');
}

#[test]
#[should_panic(expected: ('FeatureUtils: disabled feature',))]
fn given_exist_feature_when_validate_feature_then_fails() {
    let data_store = setup();

    data_store.set_bool('EXIST_FEATURE', true);

    validate_feature(data_store, 'EXIST_FEATURE'); // Should revert because feature is disabled
}

#[test]
fn given_exist_enabled_feature_when_validate_feature_then_works() {
    let data_store = setup();

    data_store.set_bool('EXIST_FEATURE', false);

    validate_feature(data_store, 'EXIST_FEATURE'); // Should work because feature is enabled
}

fn setup() -> IDataStoreDispatcher {
    let (
        _caller_address,
        _market_token_class,
        _increase_order_class,
        _decrease_order_class,
        _swap_order_class,
        _order_utils_class,
        _role_module_class,
        _bank_class,
        _governable_class,
        _market_utils_class,
        _market_factory,
        _role_store,
        data_store,
        _event_emitter,
        _exchange_router,
        _deposit_handler,
        _deposit_vault,
        _oracle,
        _order_handler,
        _order_vault,
        _reader,
        _referal_storage,
        _withdrawal_handler,
        _withdrawal_vault,
        _liquidation_handler,
        _,
        _,
        _,
    ) =
        tests_lib::setup();

    data_store
}
