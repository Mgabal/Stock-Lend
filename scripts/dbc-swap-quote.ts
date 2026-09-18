import { Connection, PublicKey } from '@solana/web3.js'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import BN from 'bn.js'

async function main() {
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed')
    const client = new DynamicBondingCurveClient(connection, 'confirmed')

    const poolAddress = new PublicKey('HGeF776RgSaHxzWEeAnqYg6wufea8S6Q6mxJkdbW59Lm')

    const poolAccount = await client.state.getPool(poolAddress)
    if (!poolAccount) {
        throw new Error(`Pool not found: ${poolAddress.toString()}`)
    }

    const poolConfigState = await client.state.getPoolConfig(poolAccount.poolState.config)

    const amountIn = new BN(0.1 * 1e9)

    const quote = client.pool.swapQuote({
        virtualPool: poolAccount,
        config: poolConfigState,
        swapBaseForQuote: false,
        amountIn,
        slippageBps: 100,
        hasReferral: false,
        eligibleForFirstSwapWithMinFee: false,
        currentPoint: new BN(0),
    })

    console.log('--- Swap Quote: buying sTSLA with 0.1 SOL ---')
    console.log(JSON.stringify(quote, (key, value) =>
        typeof value === 'object' && value !== null && value.constructor?.name === 'BN'
            ? value.toString()
            : value
    , 2))
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})
