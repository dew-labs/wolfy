use satoru::data::data_store::IDataStoreDispatcherTrait;
use satoru::nonce::nonce_utils::{get_current_nonce, increment_nonce, compute_key};
use satoru::test_utils::tests_lib;

#[test]
fn given_normal_conditions_when_nonce_utils_functions_then_works() {
    // *********************************************************************************************
    // *                              SETUP                                                        *
    // *********************************************************************************************
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
        _,
    ) =
        tests_lib::setup();

    // *********************************************************************************************
    // *                              TEST LOGIC                                                   *
    // *********************************************************************************************

    let nonce = get_current_nonce(data_store);
    assert(nonce == 0, 'Invalid nonce');

    let nonce = increment_nonce(data_store);
    assert(nonce == 1, 'Invalid new nonce');

    let nonce = get_current_nonce(data_store);
    assert(nonce == 1, 'Invalid final nonce');

    let key = compute_key(42069.try_into().unwrap(), 2);
    assert(key == 0x24bd38ceb23566640607e8fd6d1ef05cf308413863f984763744a3cfd428b1b, 'Invalid key');

    // *********************************************************************************************
    // *                              TEARDOWN                                                     *
    // *********************************************************************************************
    tests_lib::teardown();
}
