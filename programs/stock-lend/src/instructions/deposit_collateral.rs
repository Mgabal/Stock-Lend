use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked,
};

use crate::state::{LendingMarket, UserPosition};
use crate::constants::*;
use crate::error::LendError;

pub fn deposit_collateral(ctx: Context<DepositCollateral>, amount: u64) -> Result<()> {
    require!(amount > 0, LendError::InvalidAmount);

    let cpi_accounts = TransferChecked {
        from: ctx.accounts.user_collateral_ata.to_account_info(),
        mint: ctx.accounts.collateral_mint.to_account_info(),
        to: ctx.accounts.collateral_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    transfer_checked(cpi_ctx, amount, ctx.accounts.collateral_mint.decimals)?;

    let position = &mut ctx.accounts.user_position;
    position.owner = ctx.accounts.user.key();
    position.market = ctx.accounts.market.key();
    position.collateral_deposited = position.collateral_deposited.checked_add(amount).unwrap();
    position.bump = ctx.bumps.user_position;

    Ok(())
}

#[derive(Accounts)]
pub struct DepositCollateral<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [MARKET_SEED, market.collateral_mint.as_ref()],
        bump = market.bump
    )]
    pub market: Account<'info, LendingMarket>,

    #[account(
        init_if_needed,
        payer = user,
        space = UserPosition::LEN,
        seeds = [USER_POSITION_SEED, market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,

    pub collateral_mint: InterfaceAccount<'info, Mint>,

    #[account(mut)]
    pub user_collateral_ata: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [COLLATERAL_VAULT_SEED, market.key().as_ref()],
        bump
    )]
    pub collateral_vault: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}