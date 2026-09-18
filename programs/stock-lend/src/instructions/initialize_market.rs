use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::state::LendingMarket;
use crate::constants::*;
use crate::error::LendError;

pub fn initialize_market(
    ctx: Context<InitializeMarket>,
    ltv_bps: u16,
    mock_price: u64,
) -> Result<()> {
    require!(ltv_bps > 0 && ltv_bps <= 10_000, LendError::InvalidLtv);
    require!(mock_price > 0, LendError::InvalidAmount);

    let market = &mut ctx.accounts.market;
    market.collateral_mint = ctx.accounts.collateral_mint.key();
    market.borrow_mint = ctx.accounts.borrow_mint.key();
    market.ltv_bps = ltv_bps;
    market.mock_price = mock_price;
    market.collateral_vault = ctx.accounts.collateral_vault.key();
    market.borrow_vault = ctx.accounts.borrow_vault.key();
    market.bump = ctx.bumps.market;

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = LendingMarket::LEN,
        seeds = [MARKET_SEED, collateral_mint.key().as_ref()],
        bump
    )]
    pub market: Account<'info, LendingMarket>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,
    pub borrow_mint: InterfaceAccount<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [COLLATERAL_VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = collateral_mint,
        token::authority = market,
    )]
    pub collateral_vault: InterfaceAccount<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [BORROW_VAULT_SEED, market.key().as_ref()],
        bump,
        token::mint = borrow_mint,
        token::authority = market,
    )]
    pub borrow_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}