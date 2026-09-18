import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk'
import BN from 'bn.js'
import { DBC_POOL } from './constants'

export function useDbcPool() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const [loading, setLoading] = useState(true)
  const [priceSol, setPriceSol] = useState<number | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<{ msg: string; type: 'pending' | 'success' | 'error' } | null>(null)

  const client = new DynamicBondingCurveClient(connection, 'confirmed')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const poolAccount = await client.state.getPool(DBC_POOL)
      if (!poolAccount) throw new Error('Pool not found')

      const poolConfigState = await client.state.getPoolConfig(poolAccount.poolState.config)

      // quote a tiny 0.001 SOL buy just to read the implied price
      const quote = client.pool.swapQuote({
        virtualPool: poolAccount,
        config: poolConfigState,
        swapBaseForQuote: false,
        amountIn: new BN(0.001 * 1e9),
        slippageBps: 100,
        hasReferral: false,
        eligibleForFirstSwapWithMinFee: false,
        currentPoint: new BN(0),
      })

      const outUi = Number(quote.outputAmount.toString()) / 1e6
      const inUi = 0.001
      setPriceSol(outUi > 0 ? inUi / outUi : null)

      const curveProgress = await client.state.getPoolQuoteTokenCurveProgress(DBC_POOL)
      setProgress(curveProgress)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
  }, [refresh])

  const buy = async (solAmount: number) => {
    if (!publicKey) {
      setStatus({ msg: 'Connect your wallet first.', type: 'error' })
      return
    }
    setStatus({ msg: 'Building transaction…', type: 'pending' })
    try {
      const tx = await client.pool.swap({
        amountIn: new BN(solAmount * 1e9),
        minimumAmountOut: new BN(0),
        swapBaseForQuote: false,
        owner: publicKey,
        pool: DBC_POOL,
        referralTokenAccount: null,
      })

      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash
      tx.feePayer = publicKey

      setStatus({ msg: 'Waiting for wallet approval…', type: 'pending' })
      const sig = await sendTransaction(tx, connection)
      setStatus({ msg: `Confirming — ${sig}`, type: 'pending' })
      await connection.confirmTransaction(sig, 'confirmed')
      setStatus({ msg: `Bought sTSLA. Tx: ${sig}`, type: 'success' })
      await refresh()
    } catch (e: any) {
      setStatus({ msg: `Error: ${e.message || e.toString()}`, type: 'error' })
    }
  }

  return { loading, priceSol, progress, buy, status }
}