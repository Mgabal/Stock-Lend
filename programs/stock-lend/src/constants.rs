use anchor_lang::prelude::*;

#[constant]
pub const MARKET_SEED: &[u8] = b"market";

#[constant]
pub const COLLATERAL_VAULT_SEED: &[u8] = b"collateral_vault";

#[constant]
pub const BORROW_VAULT_SEED: &[u8] = b"borrow_vault";

#[constant]
pub const USER_POSITION_SEED: &[u8] = b"user_position";

pub const BPS_DENOMINATOR: u64 = 10_000;