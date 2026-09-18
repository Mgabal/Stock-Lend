import {
    Connection,
    Keypair,
    PublicKey,
    sendAndConfirmTransaction,
} from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import * as fs from 'fs'
import * as os from 'os'

async function main() {
    const walletPath = os.homedir() + '/.config/solana/id.json'
    const secret = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    const wallet = Keypair.fromSecretKey(new Uint8Array(secret))
    console.log(`Wallet: ${wallet.publicKey.toString()}`)

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

    const configAddress = new PublicKey('3QUfXv7GGF7Ybad6cmVK9tj8BP2mmpaLDr2ts255vhic')
    console.log(`Using config: ${configAddress.toString()}`)

    const baseMint = Keypair.generate()
    console.log(`Generated stock token mint: ${baseMint.publicKey.toString()}`)

    const client = new DynamicBondingCurveClient(connection, 'confirmed')

    const createPoolParam = {
        baseMint: baseMint.publicKey,
        config: configAddress,
        name: 'Sable Tokenized TSLA',
        symbol: 'sTSLA',
        uri: '',
        payer: wallet.publicKey,
        poolCreator: wallet.publicKey,
    }

    console.log('Creating DBC pool...')
    const poolTransaction = await client.creator.createPool(createPoolParam)

    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    poolTransaction.recentBlockhash = blockhash
    poolTransaction.feePayer = wallet.publicKey

    const signature = await sendAndConfirmTransaction(
        connection,
        poolTransaction,
        [wallet, baseMint],
        { commitment: 'confirmed', skipPreflight: true }
    )

    console.log(`Pool created! Signature: ${signature}`)
    console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`)
    console.log(`Stock token mint (sTSLA): ${baseMint.publicKey.toString()}`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
