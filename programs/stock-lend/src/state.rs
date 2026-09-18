use anchor_lang::prelude::*;

#[account]
pub struct LendingMarket {
    pub collateral_mint: Pubkey,
    pub borrow_mint: Pubkey,
    pub ltv_bps: u16,        // loan-to-value in basis points, e.g. 5000 = 50%
    pub mock_price: u64,     // mock price of collateral token in borrow-token units (6 decimals)
    pub collateral_vault: Pubkey,
    pub borrow_vault: Pubkey,
    pub bump: u8,
}

#[account]
pub struct UserPosition {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub collateral_deposited: u64,
    pub borrowed_amount: u64,
    pub bump: u8,
}

impl UserPosition {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1;
}

impl LendingMarket {
    pub const LEN: usize = 8 + 32 + 32 + 2 + 8 + 32 + 32 + 1;
}