mod ix_handlers;

use litesvm::LiteSVM;
use litesvm_token::spl_token;
use solana_keypair::Keypair;
use solana_pubkey::Pubkey;
use solana_signer::Signer;
use solana_program_pack::Pack;

use ix_handlers::init::setup_market;
use ix_handlers::deposit::{create_user_with_ata, deposit_collateral};
use ix_handlers::borrow::borrow;
use ix_handlers::repay::{repay, withdraw_collateral};

const PROGRAM_ID: &str = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"; // replace with your actual declared program ID

fn setup() -> (LiteSVM, Pubkey) {
    let mut svm = LiteSVM::new();
    let program_id = Pubkey::try_from(PROGRAM_ID).unwrap();
    svm.add_program_from_file(program_id, "../../target/deploy/stock_lend.so").unwrap();
    (svm, program_id)
}

fn get_token_balance(svm: &LiteSVM, ata: Pubkey) -> u64 {
    let account = svm.get_account(&ata).unwrap();
    let token_data = spl_token_interface::state::Account::unpack(&account.data).unwrap();
    token_data.amount
}

#[test]
fn test_initialize_market() {
    let (mut svm, program_id) = setup();
    let market = setup_market(&mut svm, program_id, 5000, 250_000_000); // 50% LTV, price 250.000000
    assert_eq!(svm.get_account(&market.market).is_some(), true);
}

#[test]
fn test_deposit_collateral() {
    let (mut svm, program_id) = setup();
    let market = setup_market(&mut svm, program_id, 5000, 250_000_000);

    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    let user_collateral_ata = create_user_with_ata(&mut svm, &market.authority, market.collateral_mint, user.pubkey());
    ix_handlers::init::mint_to_user(&mut svm, &market.authority, market.collateral_mint, user_collateral_ata, 10_000_000_000);

    deposit_collateral(&mut svm, program_id, &market, &user, user_collateral_ata, 1_000_000_000);

    let vault_balance = get_token_balance(&svm, market.collateral_vault);
    assert_eq!(vault_balance, 1_000_000_000);
}

#[test]
fn test_borrow_success() {
    let (mut svm, program_id) = setup();
    let market = setup_market(&mut svm, program_id, 5000, 250_000_000); // 50% LTV, $250/token

    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    let user_collateral_ata = create_user_with_ata(&mut svm, &market.authority, market.collateral_mint, user.pubkey());
    ix_handlers::init::mint_to_user(&mut svm, &market.authority, market.collateral_mint, user_collateral_ata, 10_000_000_000);
    deposit_collateral(&mut svm, program_id, &market, &user, user_collateral_ata, 1_000_000_000); // deposit 1000 TSLAx

    // seed the borrow vault with liquidity so there's USDC to lend
    ix_handlers::init::mint_to_user(&mut svm, &market.authority, market.borrow_mint, market.borrow_vault, 1_000_000_000_000);

    let user_borrow_ata = create_user_with_ata(&mut svm, &market.authority, market.borrow_mint, user.pubkey());

    // collateral value = 1000 * 250 = 250,000; max borrow at 50% LTV = 125,000
    let borrow_amount = 100_000_000_000; // 100,000 USDC (well within limit)
    let result = borrow(&mut svm, program_id, &market, &user, user_borrow_ata, borrow_amount);
    assert!(result.is_ok());

    let user_balance = get_token_balance(&svm, user_borrow_ata);
    assert_eq!(user_balance, borrow_amount);
}

#[test]
fn test_borrow_exceeds_ltv_fails() {
    let (mut svm, program_id) = setup();
    let market = setup_market(&mut svm, program_id, 5000, 250_000_000);

    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    let user_collateral_ata = create_user_with_ata(&mut svm, &market.authority, market.collateral_mint, user.pubkey());
    ix_handlers::init::mint_to_user(&mut svm, &market.authority, market.collateral_mint, user_collateral_ata, 10_000_000_000);
    deposit_collateral(&mut svm, program_id, &market, &user, user_collateral_ata, 1_000_000_000); // 1000 TSLAx

    ix_handlers::init::mint_to_user(&mut svm, &market.authority, market.borrow_mint, market.borrow_vault, 1_000_000_000_000);
    let user_borrow_ata = create_user_with_ata(&mut svm, &market.authority, market.borrow_mint, user.pubkey());

    // max borrow = 125,000 USDC; try to borrow 200,000 — should fail
    let result = borrow(&mut svm, program_id, &market, &user, user_borrow_ata, 200_000_000_000);
    assert!(result.is_err());
}

#[test]
fn test_repay_and_withdraw() {
    let (mut svm, program_id) = setup();
    let market = setup_market(&mut svm, program_id, 5000, 250_000_000);

    let user = Keypair::new();
    svm.airdrop(&user.pubkey(), 10_000_000_000).unwrap();

    let user_collateral_ata = create_user_with_ata(&mut svm, &market.authority, market.collateral_mint, user.pubkey());
    ix_handlers::init::mint_to_user(&mut svm, &market.authority, market.collateral_mint, user_collateral_ata, 10_000_000_000);
    deposit_collateral(&mut svm, program_id, &market, &user, user_collateral_ata, 1_000_000_000);

    ix_handlers::init::mint_to_user(&mut svm, &market.authority, market.borrow_mint, market.borrow_vault, 1_000_000_000_000);
    let user_borrow_ata = create_user_with_ata(&mut svm, &market.authority, market.borrow_mint, user.pubkey());

    let borrow_amount = 50_000_000_000;
    borrow(&mut svm, program_id, &market, &user, user_borrow_ata, borrow_amount).unwrap();

    repay(&mut svm, program_id, &market, &user, user_borrow_ata, borrow_amount);

    let remaining_borrow_balance = get_token_balance(&svm, user_borrow_ata);
    assert_eq!(remaining_borrow_balance, 0);

    // now that debt is fully repaid, withdraw all collateral
    withdraw_collateral(&mut svm, program_id, &market, &user, user_collateral_ata, 1_000_000_000);
    let final_collateral_balance = get_token_balance(&svm, market.collateral_vault);
    assert_eq!(final_collateral_balance, 0);
}