# Sable — Tokenized Stock Infrastructure on Solana

Sable is a two-part protocol exploring what tokenized equity infrastructure looks like on Solana:

1. **Launch** — a tokenized stock (sTSLA) issued via Meteora's Dynamic Bonding Curve (DBC), with a curve configuration deliberately tuned for equity-style price discovery rather than memecoin speculation.
2. **Borrow** — a lending protocol that lets holders instantly borrow stablecoins against their tokenized stock as collateral, 24/7, with no credit check and no waiting for market hours.

Built for [Hackathon Name] — Solana Foundation tokenized stocks track, and submitted for Meteora's "Best Use of DBC" bounty.

---

## Why this pairing

Real brokerages close. Weekends, holidays, after-hours — your equity sits idle. Sable's thesis is that tokenized stocks only become genuinely useful once two things exist together: a credible way to launch and price them, and a way to use them as productive collateral without leaving the chain. This repo builds both halves.

---

## Part 1 — Launch: sTSLA on Meteora DBC

Instead of a generic memecoin-style bonding curve, the DBC config here is tuned for an equity use case:

- **Modest graduation multiple (3x)**: initial market cap ~30 SOL, migrating to DAMM v2 liquidity at ~90 SOL. This rewards genuine price discovery over a moonshot pump.
- **Flat 0.5% fee**, no punitive early-trade tax — equities don't need meme-coin-style anti-sniper mechanics.
- **No dynamic fee** — predictable costs for traders.
- **50/50 permanent-locked liquidity split** between partner and creator on migration, so liquidity is credibly locked rather than rug-pullable.

**Live on devnet:**
- Config: `3QUfXv7GGF7Ybad6cmVK9tj8BP2mmpaLDr2ts255vhic`
- Pool: `HGeF776RgSaHxzWEeAnqYg6wufea8S6Q6mxJkdbW59Lm`
- sTSLA mint: `EXgb8dMEgZfd2N2t95a3LSjrkNm8przC8Z9u5MhuAZic`

Scripts (in `scripts/`):
- `dbc-create-config.ts` — builds and submits the curve config
- `dbc-create-pool.ts` — creates the pool from that config
- `dbc-swap-buy.ts` — executes a real buy into the curve
- `dbc-swap-quote.ts` — quotes a swap without executing it

---

## Part 2 — Borrow: lending against tokenized stock

An Anchor program (`programs/stock-lend/`) implementing:

- `initialize_market` — sets up a lending market for a collateral/borrow mint pair, with a loan-to-value ratio and a reference price
- `deposit_collateral` — deposit tokenized stock into a program-owned vault
- `borrow` — instantly borrow stablecoins against deposited collateral, up to the LTV limit
- `repay` — repay borrowed stablecoins
- `withdraw_collateral` — reclaim collateral once debt is repaid (and LTV still allows it)

**Live on devnet:**
- Program ID: `8MFfkTvA13QJKue1k8qwFqaPFxJm9qiJDYPoRUtvoZ3Z`
- Market (TSLAx/mock USDC): seeded at 50% LTV, reference price $250/token

Full test suite (`programs/stock-lend/tests/`) uses LiteSVM and covers: market initialization, deposit, successful borrow, borrow-exceeding-LTV failure, and repay + withdraw. Run with:

```bash
cargo test --manifest-path programs/stock-lend/Cargo.toml
```

### Disclosed scope limitation

Pricing in the lending market uses a **seeded reference rate**, not a live oracle feed. This is an intentional scoping choice for the hackathon timeline, not a hidden gap — a production version would need an oracle (e.g. Pyth) feeding real-time tokenized-stock prices before this could safely run with real user funds. Liquidations are also not implemented in this version; they're a natural next step once an oracle is wired in.

---

## Frontend

`frontend/` is a Vite + React app with two sections matching the two halves of the protocol:

- **Launch**: shows live implied price and curve progress toward graduation, with a buy button
- **Borrow**: shows wallet balances, deposited collateral, and current borrow, with deposit/borrow/repay actions

Connects to Phantom on devnet. Run locally:

```bash
cd frontend
yarn install
yarn dev
```

---

## Tech stack

- **Solana / Anchor** (0.32.1) for the lending program
- **LiteSVM** for fast, in-process program testing
- **Meteora Dynamic Bonding Curve SDK** (`@meteora-ag/dynamic-bonding-curve-sdk`) for the stock launch
- **React + Vite + TypeScript** for the frontend
- **@solana/wallet-adapter** (Phantom) for wallet connection

---
