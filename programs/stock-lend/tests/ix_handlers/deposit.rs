use anchor_lang::{InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use litesvm_token::spl_token;
use litesvm_token::CreateAssociatedTokenAccount;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::Transaction;

use crate::ix_handlers::init::{
    convert_account_metas, to_anchor_pubkey, TestMarket, COLLATERAL_VAULT_SEED, USER_POSITION_SEED,
};

pub fn deposit_collateral(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    market: &TestMarket,
    user: &Keypair,
    user_collateral_ata: Pubkey,
    amount: u64,
) {
    let (user_position, _) = Pubkey::find_program_address(
        &[USER_POSITION_SEED, market.market.as_ref(), user.pubkey().as_ref()],
        &program_id,
    );
    let (collateral_vault, _) = Pubkey::find_program_address(
        &[COLLATERAL_VAULT_SEED, market.market.as_ref()],
        &program_id,
    );

    let accounts = stock_lend::accounts::DepositCollateral {
        user: to_anchor_pubkey(user.pubkey()),
        market: to_anchor_pubkey(market.market),
        user_position: to_anchor_pubkey(user_position),
        collateral_mint: to_anchor_pubkey(market.collateral_mint),
        user_collateral_ata: to_anchor_pubkey(user_collateral_ata),
        collateral_vault: to_anchor_pubkey(collateral_vault),
        token_program: to_anchor_pubkey(spl_token::ID),
        system_program: anchor_lang::solana_program::system_program::ID,
    };

    let ix_data = stock_lend::instruction::DepositCollateral { amount };

    let ix = solana_instruction::Instruction {
        program_id,
        accounts: convert_account_metas(accounts.to_account_metas(None)),
        data: ix_data.data(),
    };

    let msg = Message::new(&[ix], Some(&user.pubkey()));
    let tx = Transaction::new(&[user], msg, svm.latest_blockhash());
    svm.send_transaction(tx).unwrap();
}

pub fn create_user_with_ata(
    svm: &mut LiteSVM,
    payer: &Keypair,
    mint: Pubkey,
    owner: Pubkey,
) -> Pubkey {
    CreateAssociatedTokenAccount::new(svm, payer, &mint)
        .owner(&owner)
        .send()
        .unwrap()
}