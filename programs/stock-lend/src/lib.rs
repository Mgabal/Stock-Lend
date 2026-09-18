use anchor_lang::prelude::*;

pub mod state;
pub mod constants;
pub mod error;
pub mod instructions;

use instructions::*;

declare_id!("8MFfkTvA13QJKue1k8qwFqaPFxJm9qiJDYPoRUtvoZ3Z");

#[program]
pub mod stock_lend {
    use super::*;

    pub fn initialize_market(ctx: Context<InitializeMarket>, ltv_bps: u16, mock_price: u64) -> Result<()> {
        instructions::initialize_market::initialize_market(ctx, ltv_bps, mock_price)
    }

    pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
        instructions::deposit_collateral::deposit_collateral(ctx, amount)
    }

    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        instructions::borrow::borrow(ctx, amount)
    }

    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        instructions::repay::repay(ctx, amount)
    }

    pub fn withdraw_collateral(ctx: Context<WithdrawCollateral>, amount: u64) -> Result<()> {
        instructions::repay::withdraw_collateral(ctx, amount)
    }
}