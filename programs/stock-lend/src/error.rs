use anchor_lang::prelude::*;

#[error_code]
pub enum LendError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient collateral for this borrow amount")]
    InsufficientCollateral,
    #[msg("Repay amount exceeds outstanding borrow")]
    RepayExceedsBorrow,
    #[msg("Loan-to-value ratio too high")]
    InvalidLtv,
}