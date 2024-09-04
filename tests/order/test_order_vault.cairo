// *************************************************************************
//                                  IMPORTS
// *************************************************************************

// Core lib imports.

use result::ResultTrait;
use starknet::{ContractAddress, get_caller_address, contract_address_const, ClassHash};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait, start_cheat_block_number};

// TODO test when StrictBank functions will be implemented.

// Local imports.
use satoru::utils::span32::{Span32, Array32Trait};

#[test]
fn given_normal_conditions_when_transfer_out_then_expect_balance_change() { // TODO
}

