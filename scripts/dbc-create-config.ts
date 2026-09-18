import {
    Connection,
    Keypair,
    sendAndConfirmTransaction,
} from '@solana/web3.js'
import {
    buildCurveWithMarketCap,
    DynamicBondingCurveClient,
    ActivationType,
    CollectFeeMode,
    BaseFeeMode,
    MigrationFeeOption,
    MigrationOption,
    TokenDecimal,
    TokenType,
    TokenAuthorityOption,
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { NATIVE_MINT } from '@solana/spl-token'
import * as fs from 'fs'
import * as os from 'os'

async function main() {
    const walletPath = os.homedir() + '/.config/solana/id.json'
    const secret = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    const wallet = Keypair.fromSecretKey(new Uint8Array(secret))
    console.log(`Wallet: ${wallet.publicKey.toString()}`)

    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')

    const config = Keypair.generate()
    console.log(`Config account: ${config.publicKey.toString()}`)

    const curveConfig = buildCurveWithMarketCap({
        token: {
            tokenType: TokenType.SPLToken,
            tokenBaseDecimal: TokenDecimal.SIX,
            tokenQuoteDecimal: TokenDecimal.NINE,
            tokenAuthorityOption: TokenAuthorityOption.Immutable,
            totalTokenSupply: 1_000_000_000,
            leftover: 0,
        },
        fee: {
            baseFeeParams: {
                baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
                feeSchedulerParam: {
                    startingFeeBps: 50,
                    endingFeeBps: 50,
                    numberOfPeriod: 0,
                    totalDuration: 0,
                },
            },
            dynamicFeeEnabled: false,
            collectFeeMode: CollectFeeMode.QuoteToken,
            creatorTradingFeePercentage: 0,
            poolCreationFee: 0,
            enableFirstSwapWithMinFee: false,
        },
        migration: {
            migrationOption: MigrationOption.MET_DAMM_V2,
            migrationFeeOption: MigrationFeeOption.FixedBps100,
            migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
        },
        liquidityDistribution: {
            partnerLiquidityPercentage: 0,
            partnerPermanentLockedLiquidityPercentage: 50,
            creatorLiquidityPercentage: 0,
            creatorPermanentLockedLiquidityPercentage: 50,
        },
        lockedVesting: {
            totalLockedVestingAmount: 0,
            numberOfVestingPeriod: 0,
            cliffUnlockAmount: 0,
            totalVestingDuration: 0,
            cliffDurationFromMigrationTime: 0,
        },
        activationType: ActivationType.Slot,
        initialMarketCap: 30,
        migrationMarketCap: 90,
    })

    console.log('Curve config built:', curveConfig)

    const client = new DynamicBondingCurveClient(connection, 'confirmed')

    const transaction = await client.partner.createConfig({
        config: config.publicKey,
        feeClaimer: wallet.publicKey,
        leftoverReceiver: wallet.publicKey,
        payer: wallet.publicKey,
        quoteMint: NATIVE_MINT,
        ...curveConfig,
    })

    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = wallet.publicKey
    transaction.partialSign(config)

    const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [wallet, config],
        { commitment: 'confirmed' }
    )

    console.log(`Config created! Signature: ${signature}`)
    console.log(`Config address: ${config.publicKey.toString()}`)
    console.log(`\nSAVE THIS CONFIG ADDRESS for the next step.`)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
