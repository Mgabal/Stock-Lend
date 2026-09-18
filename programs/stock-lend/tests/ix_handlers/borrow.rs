use anchor_lang::{InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use litesvm_token::spl_token;
use solana_keypair::Keypair;
use solana_message::Message;
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::Transaction;

use crate::ix_handlers::init::{
    convert_account_metas, to_anchor_pubkey, TestMarket, BORROW_VAULT_SEED, USER_POSITION_SEED,
};

pub fn borrow(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    market: &TestMarket,
    user: &Keypair,
    user_borrow_ata: Pubkey,
    amount: u64,
) -> Result<(), litesvm::types::FailedTransactionMetadata> {
    let (user_position, _) = Pubkey::find_program_address(
        &[USER_POSITION_SEED, market.market.as_ref(), user.pubkey().as_ref()],
        &program_id,
    );
    let (borrow_vault, _) = Pubkey::find_program_address(
        &[BORROW_VAULT_SEED, market.market.as_ref()],
        &program_id,
    );

    let accounts = stock_lend::accounts::Borrow {
        user: to_anchor_pubkey(user.pubkey()),
        market: to_anchor_pubkey(market.market),
        user_position: to_anchor_pubkey(user_position),
        borrow_mint: to_anchor_pubkey(market.borrow_mint),
        user_borrow_ata: to_anchor_pubkey(user_borrow_ata),
        borrow_vault: to_anchor_pubkey(borrow_vault),
        token_program: to_anchor_pubkey(spl_token::ID),
    };

    let ix_data = stock_lend::instruction::Borrow { amount };

    let ix = solana_instruction::Instruction {
        program_id,
        accounts: convert_account_metas(accounts.to_account_metas(None)),
        data: ix_data.data(),
    };

    let msg = Message::new(&[ix], Some(&user.pubkey()));
    let tx = Transaction::new(&[user], msg, svm.latest_blockhash());
    svm.send_transaction(tx).map(|_| ())
}