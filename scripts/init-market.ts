import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { StockLend } from "../target/types/stock_lend";
import idl from "../target/idl/stock_lend.json";

// Your devnet mints
const COLLATERAL_MINT = new PublicKey("8esRR5j7stVQqWEEECViGKjRQ5GyruS1NwRydkvtBW1o"); // TSLAx
const BORROW_MINT = new PublicKey("2ajNEFRdoXqmDY2QrYL7mXXjgdMXFNQxyAqbHTSVFk6j");     // Mock USDC

const LTV_BPS = 5000;              // 50% loan-to-value
const MOCK_PRICE = 250_000_000;    // $250.000000 per TSLAx (6 decimals)

async function main() {
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider = anchor.getProvider() as anchor.AnchorProvider;
  const program = new Program(idl as anchor.Idl, provider) as unknown as Program<StockLend>;

  const [market] = PublicKey.findProgramAddressSync(
    [Buffer.from("market"), COLLATERAL_MINT.toBuffer()],
    program.programId
  );
  const [collateralVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("collateral_vault"), market.toBuffer()],
    program.programId
  );
  const [borrowVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("borrow_vault"), market.toBuffer()],
    program.programId
  );

  console.log("Market PDA:          ", market.toBase58());
  console.log("Collateral vault PDA:", collateralVault.toBase58());
  console.log("Borrow vault PDA:    ", borrowVault.toBase58());

      const tx = await program.methods
    .initializeMarket(LTV_BPS, new anchor.BN(MOCK_PRICE))
    .accounts({
      authority: provider.wallet.publicKey,
      collateralMint: COLLATERAL_MINT,
      borrowMint: BORROW_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();

  console.log("Market initialized. Signature:", tx);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});