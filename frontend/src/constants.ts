import { PublicKey } from '@solana/web3.js'

// Lending program
export const LENDING_PROGRAM_ID = new PublicKey('8MFfkTvA13QJKue1k8qwFqaPFxJm9qiJDYPoRUtvoZ3Z')
export const COLLATERAL_MINT = new PublicKey('8esRR5j7stVQqWEEECViGKjRQ5GyruS1NwRydkvtBW1o') // TSLAx
export const BORROW_MINT = new PublicKey('2ajNEFRdoXqmDY2QrYL7mXXjgdMXFNQxyAqbHTSVFk6j') // Mock USDC

// DBC (Meteora) — sTSLA launch
export const STSLA_MINT = new PublicKey('EXgb8dMEgZfd2N2t95a3LSjrkNm8przC8Z9u5MhuAZic')
export const DBC_POOL = new PublicKey('HGeF776RgSaHxzWEeAnqYg6wufea8S6Q6mxJkdbW59Lm')
export const DBC_CONFIG = new PublicKey('3QUfXv7GGF7Ybad6cmVK9tj8BP2mmpaLDr2ts255vhic')

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')