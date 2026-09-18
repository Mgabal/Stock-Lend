use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::state::{LendingMarket, UserPosition};
use crate::constants::*;
use crate::error::LendError;

pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
    require!(amount > 0, LendError::InvalidAmount);

    let market = &ctx.accounts.market;
    let position = &mut ctx.accounts.user_position;

    let collateral_value = (position.collateral_deposited as u128)
        .checked_mul(market.mock_price as u128)
        .unwrap()
        .checked_div(1_000_000)
        .unwrap();

    let max_borrow = collateral_value
        .checked_mul(market.ltv_bps as u128)
        .unwrap()
        .checked_div(BPS_DENOMINATOR as u128)
        .unwrap() as u64;

    let new_borrowed = position.borrowed_amount.checked_add(amount).unwrap();
    require!(new_borrowed <= max_borrow, LendError::InsufficientCollateral);

    let collateral_mint_key = market.collateral_mint;
    let seeds = &[
        MARKET_SEED,
        collateral_mint_key.as_ref(),
        &[market.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.borrow_vault.to_account_info(),
        mint: ctx.accounts.borrow_mint.to_account_info(),
        to: ctx.accounts.user_borrow_ata.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    transfer_checked(cpi_ctx, amount, ctx.accounts.borrow_mint.decimals)?;

    position.borrowed_amount = new_borrowed;

    Ok(())
}

#[derive(Accounts)]
pub struct Borrow<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [MARKET_SEED, market.collateral_mint.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, LendingMarket>,

    #[account(
        mut,
        seeds = [USER_POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump = user_position.bump,
        constraint = user_position.owner == user.key() @ LendError::InvalidAmount
    )]
    pub user_position: Account<'info, UserPosition>,

    pub borrow_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub user_borrow_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [BORROW_VAULT_SEED, market.key().as_ref()],
        bump
    )]
    pub borrow_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
}