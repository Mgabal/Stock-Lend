use anchor_lang::{InstructionData, ToAccountMetas};
use litesvm::LiteSVM;
use litesvm_token::spl_token;
use litesvm_token::{CreateMint, MintTo};
use solana_keypair::Keypair;
use solana_message::Message;
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_transaction::Transaction;

pub const MARKET_SEED: &[u8] = b"market";
pub const COLLATERAL_VAULT_SEED: &[u8] = b"collateral_vault";
pub const BORROW_VAULT_SEED: &[u8] = b"borrow_vault";
pub const USER_POSITION_SEED: &[u8] = b"user_position";

pub fn to_anchor_pubkey(p: Pubkey) -> anchor_lang::prelude::Pubkey {
    anchor_lang::prelude::Pubkey::new_from_array(p.to_bytes())
}

pub fn to_svm_pubkey(p: anchor_lang::prelude::Pubkey) -> Pubkey {
    Pubkey::new_from_array(p.to_bytes())
}

pub fn convert_account_metas(
    metas: Vec<anchor_lang::prelude::AccountMeta>,
) -> Vec<solana_instruction::AccountMeta> {
    metas
        .into_iter()
        .map(|m| solana_instruction::AccountMeta {
            pubkey: to_svm_pubkey(m.pubkey),
            is_signer: m.is_signer,
            is_writable: m.is_writable,
        })
        .collect()
}

pub struct TestMarket {
    pub authority: Keypair,
    pub collateral_mint: Pubkey,
    pub borrow_mint: Pubkey,
    pub market: Pubkey,
    pub collateral_vault: Pubkey,
    pub borrow_vault: Pubkey,
}

pub fn setup_market(
    svm: &mut LiteSVM,
    program_id: Pubkey,
    ltv_bps: u16,
    mock_price: u64,
) -> TestMarket {
    let authority = Keypair::new();
    svm.airdrop(&authority.pubkey(), 10_000_000_000).unwrap();

    let collateral_mint = CreateMint::new(svm, &authority)
        .decimals(6)
        .send()
        .unwrap();

    let borrow_mint = CreateMint::new(svm, &authority)
        .decimals(6)
        .send()
        .unwrap();

    let (market, _) =
        Pubkey::find_program_address(&[MARKET_SEED, collateral_mint.as_ref()], &program_id);
    let (collateral_vault, _) =
        Pubkey::find_program_address(&[COLLATERAL_VAULT_SEED, market.as_ref()], &program_id);
    let (borrow_vault, _) =
        Pubkey::find_program_address(&[BORROW_VAULT_SEED, market.as_ref()], &program_id);

    let accounts = stock_lend::accounts::InitializeMarket {
        authority: to_anchor_pubkey(authority.pubkey()),
        market: to_anchor_pubkey(market),
        collateral_mint: to_anchor_pubkey(collateral_mint),
        borrow_mint: to_anchor_pubkey(borrow_mint),
        collateral_vault: to_anchor_pubkey(collateral_vault),
        borrow_vault: to_anchor_pubkey(borrow_vault),
        token_program: to_anchor_pubkey(spl_token::ID),
        system_program: anchor_lang::solana_program::system_program::ID,
    };

    let ix_data = stock_lend::instruction::InitializeMarket { ltv_bps, mock_price };

    let ix = solana_instruction::Instruction {
        program_id,
        accounts: convert_account_metas(accounts.to_account_metas(None)),
        data: ix_data.data(),
    };

    let msg = Message::new(&[ix], Some(&authority.pubkey()));
    let tx = Transaction::new(&[&authority], msg, svm.latest_blockhash());
    svm.send_transaction(tx).unwrap();

    TestMarket {
        authority,
        collateral_mint,
        borrow_mint,
        market,
        collateral_vault,
        borrow_vault,
    }
}

pub fn mint_to_user(svm: &mut LiteSVM, authority: &Keypair, mint: Pubkey, owner: Pubkey, amount: u64) {
    MintTo::new(svm, authority, &mint, &owner, amount)
        .send()
        .unwrap();
}