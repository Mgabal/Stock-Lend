import { useState, useEffect, useCallback } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js'
import {
  LENDING_PROGRAM_ID,
  COLLATERAL_MINT,
  BORROW_MINT,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from './constants'

function encodeU64(amount: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(Math.floor(amount * 1e6)), true)
  return new Uint8Array(buf)
}

async function anchorDiscriminator(name: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode('global:' + name)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hashBuffer).slice(0, 8)
}

function getAta(mint: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0]
}

function marketPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), COLLATERAL_MINT.toBuffer()],
    LENDING_PROGRAM_ID
  )[0]
}
function userPositionPda(owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('user_position'), marketPda().toBuffer(), owner.toBuffer()],
    LENDING_PROGRAM_ID
  )[0]
}
function collateralVaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('collateral_vault'), marketPda().toBuffer()],
    LENDING_PROGRAM_ID
  )[0]
}
function borrowVaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('borrow_vault'), marketPda().toBuffer()],
    LENDING_PROGRAM_ID
  )[0]
}

export function useLending() {
  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  const [balances, setBalances] = useState({
    collateralWallet: '–',
    borrowWallet: '–',
    deposited: '–',
    borrowed: '–',
  })
  const [status, setStatus] = useState<{ msg: string; type: 'pending' | 'success' | 'error' } | null>(null)

  const refresh = useCallback(async () => {
    if (!publicKey) return
    try {
      const collateralAta = getAta(COLLATERAL_MINT, publicKey)
      const borrowAta = getAta(BORROW_MINT, publicKey)

      let collateralWallet = '0'
      let borrowWallet = '0'
      try {
        const info = await connection.getTokenAccountBalance(collateralAta)
        collateralWallet = info.value.uiAmountString || '0'
      } catch {}
      try {
        const info = await connection.getTokenAccountBalance(borrowAta)
        borrowWallet = info.value.uiAmountString || '0'
      } catch {}

      let deposited = '0'
      let borrowed = '0'
      const posPda = userPositionPda(publicKey)
      const accInfo = await connection.getAccountInfo(posPda)
      if (accInfo) {
        const data = accInfo.data
        const collateral = data.readBigUInt64LE(8 + 32 + 32)
        const borrowedAmt = data.readBigUInt64LE(8 + 32 + 32 + 8)
        deposited = (Number(collateral) / 1e6).toString()
        borrowed = (Number(borrowedAmt) / 1e6).toString()
      }

      setBalances({ collateralWallet, borrowWallet, deposited, borrowed })
    } catch (e) {
      console.error(e)
    }
  }, [publicKey, connection])

  useEffect(() => {
    if (publicKey) refresh()
  }, [publicKey, refresh])

  const sendIx = async (
    instructionName: string,
    amount: number,
    keys: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[]
  ) => {
    if (!publicKey) {
      setStatus({ msg: 'Connect your wallet first.', type: 'error' })
      return
    }
    setStatus({ msg: 'Building transaction…', type: 'pending' })
    try {
      const disc = await anchorDiscriminator(instructionName)
      const amountBytes = encodeU64(amount)
      const data = new Uint8Array(disc.length + amountBytes.length)
      data.set(disc, 0)
      data.set(amountBytes, disc.length)

      const ix = new TransactionInstruction({ programId: LENDING_PROGRAM_ID, keys, data: Buffer.from(data) })
      const tx = new Transaction().add(ix)
      tx.feePayer = publicKey
      const { blockhash } = await connection.getLatestBlockhash()
      tx.recentBlockhash = blockhash

      setStatus({ msg: 'Waiting for wallet approval…', type: 'pending' })
      const sig = await sendTransaction(tx, connection)
      setStatus({ msg: `Confirming — ${sig}`, type: 'pending' })
      await connection.confirmTransaction(sig, 'confirmed')
      setStatus({ msg: `Done. Tx: ${sig}`, type: 'success' })
      await refresh()
    } catch (e: any) {
      setStatus({ msg: `Error: ${e.message || e.toString()}`, type: 'error' })
    }
  }

  const deposit = (amount: number) => {
    if (!publicKey) return
    const market = marketPda()
    const userPosition = userPositionPda(publicKey)
    const collateralVault = collateralVaultPda()
    const userAta = getAta(COLLATERAL_MINT, publicKey)
    return sendIx('deposit_collateral', amount, [
      { pubkey: publicKey, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: userPosition, isSigner: false, isWritable: true },
      { pubkey: COLLATERAL_MINT, isSigner: false, isWritable: false },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: collateralVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ])
  }

  const borrow = (amount: number) => {
    if (!publicKey) return
    const market = marketPda()
    const userPosition = userPositionPda(publicKey)
    const borrowVault = borrowVaultPda()
    const userAta = getAta(BORROW_MINT, publicKey)
    return sendIx('borrow', amount, [
      { pubkey: publicKey, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: userPosition, isSigner: false, isWritable: true },
      { pubkey: BORROW_MINT, isSigner: false, isWritable: false },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: borrowVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ])
  }

  const repay = (amount: number) => {
    if (!publicKey) return
    const market = marketPda()
    const userPosition = userPositionPda(publicKey)
    const borrowVault = borrowVaultPda()
    const userAta = getAta(BORROW_MINT, publicKey)
    return sendIx('repay', amount, [
      { pubkey: publicKey, isSigner: true, isWritable: true },
      { pubkey: userPosition, isSigner: false, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: BORROW_MINT, isSigner: false, isWritable: false },
      { pubkey: userAta, isSigner: false, isWritable: true },
      { pubkey: borrowVault, isSigner: false, isWritable: true },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ])
  }

  return { balances, status, deposit, borrow, repay, refresh }
}