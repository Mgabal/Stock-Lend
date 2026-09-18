import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
} from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import BN from 'bn.js'
import * as fs from 'fs'
import * as os from 'os'

async function main() {
    const walletPath = os.homedir() + '/.config/solana/id.json'
    const secret = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    const wallet = Keypair.fromSecretKey(new Uint8Array(secret))
    console.log(`Wallet: ${wallet.publicKey.toString()}`)

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    const client = new DynamicBondingCurveClient(connection, 'confirmed')

    // Find the pool by its base mint (the sTSLA token)
    const baseMint = new PublicKey('EXgb8dMEgZfd2N2t95a3LSjrkNm8przC8Z9u5MhuAZic')
    const poolAccount = await client.state.getPoolByBaseMint(baseMint)
    if (!poolAccount) {
        throw new Error('No pool found for this base mint')
    }
    const poolAddress = poolAccount.publicKey
    console.log(`Pool address: ${poolAddress.toString()}`)

    const swapParam = {
        amountIn: new BN(0.05 * 1e9), // 0.05 SOL buy
        minimumAmountOut: new BN(0),
        swapBaseForQuote: false, // buying base (sTSLA) with quote (SOL)
        owner: wallet.publicKey,
        pool: poolAddress,
        referralTokenAccount: null,
    }

    console.log('Executing buy...')
    const swapTransaction = await client.pool.swap(swapParam)

    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    swapTransaction.recentBlockhash = blockhash
    swapTransaction.feePayer = wallet.publicKey

    const signature = await sendAndConfirmTransaction(
        connection,
        swapTransaction,
        [wallet],
        { commitment: 'confirmed', skipPreflight: true, maxRetries: 5 }
    )

    console.log(`Swap executed! Signature: ${signature}`)
    console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
