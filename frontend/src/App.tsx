import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useDbcPool } from './useDbcPool'
import { useLending } from './useLending'
import './App.css'

function App() {
  const { connected } = useWallet()
  const dbc = useDbcPool()
  const lending = useLending()

  const [buyAmount, setBuyAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [borrowAmount, setBorrowAmount] = useState('')
  const [repayAmount, setRepayAmount] = useState('')

  const scrollToApp = () => {
    document.getElementById('app')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="site">

      {/* NAVIGATION */}
      <nav className="topnav">
        <div className="topnav-inner">
          <div className="brand">
            <img src="src/stock.png" alt="Stock-Lend" className="brand-logo" />
          </div>

          <div className="nav-right">
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      <main>

        {/* HERO */}
        <section className="hero">
          <div className="hero-badge">
            <span className="status-dot" />
            Built on Solana
          </div>

          <h1>
            Your stock shouldn't
            <span> have to sit still.</span>
          </h1>

          <p className="hero-copy">
            Buy tokenized stocks on-chain and use them as collateral
            to access liquidity without selling your exposure.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" onClick={scrollToApp}>
              Get liquidity
              <span>→</span>
            </button>

            {!connected && (
              <span className="hero-note">
                Connect your wallet to get started
              </span>
            )}
          </div>
        </section>

        {/* SIMPLE PRODUCT CARD */}
        <section className="product-card" id="app">

          <div className="product-card-head">
            <div>
              <span className="eyebrow">STOCK-LEND</span>
              <h2>Put your sTSLA to work.</h2>
            </div>

            <div className="network-pill">
              <span className="status-dot" />
              Devnet
            </div>
          </div>

          {/* MARKET */}
          <div className="market-card">
            <div className="market-top">
              <div className="asset">
                <div className="asset-icon">T</div>
                <div>
                  <strong>sTSLA</strong>
                  <span>Tokenized Tesla exposure</span>
                </div>
              </div>

              <div className="price">
                <span className="price-label">On-chain price</span>
                <strong>
                  {dbc.loading
                    ? '…'
                    : dbc.priceSol
                      ? `${dbc.priceSol.toFixed(6)} SOL`
                      : '—'}
                </strong>
              </div>
            </div>

            <div className="curve">
              <div className="curve-labels">
                <span>Liquidity curve</span>
                <span>
                  {dbc.loading
                    ? '…'
                    : `${(dbc.progress * 100).toFixed(1)}%`}
                </span>
              </div>

              <div className="curve-track">
                <div
                  className="curve-fill"
                  style={{
                    width: `${Math.min(dbc.progress * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* BUY */}
          <div className="flow-step">
            <div className="flow-number">01</div>

            <div className="flow-content">
              <div className="flow-heading">
                <div>
                  <span className="eyebrow">ACQUIRE</span>
                  <h3>Buy sTSLA</h3>
                </div>

                <span className="flow-description">
                  Enter through the on-chain liquidity curve.
                </span>
              </div>

              <div className="input-action">
                <input
                  type="number"
                  placeholder="SOL amount"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                />

                <button
                  onClick={() => dbc.buy(Number(buyAmount))}
                  disabled={!connected}
                >
                  Buy sTSLA
                </button>
              </div>
            </div>
          </div>

          {/* POSITION */}
          <div className="position-summary">
            <div className="position-title">
              <span className="eyebrow">YOUR POSITION</span>
              <button
                className="refresh-btn"
                onClick={lending.refresh}
                disabled={!connected}
              >
                Refresh
              </button>
            </div>

            <div className="position-grid">
              <div>
                <span>sTSLA wallet</span>
                <strong>{lending.balances.collateralWallet}</strong>
              </div>

              <div>
                <span>Collateral</span>
                <strong>{lending.balances.deposited}</strong>
              </div>

              <div>
                <span>Borrowed</span>
                <strong>{lending.balances.borrowed}</strong>
              </div>

              <div>
                <span>USDC wallet</span>
                <strong>{lending.balances.borrowWallet}</strong>
              </div>
            </div>
          </div>

          {/* LENDING */}
          <div className="lending-flow">

            <div className="flow-step">
              <div className="flow-number">02</div>

              <div className="flow-content">
                <div className="flow-heading">
                  <div>
                    <span className="eyebrow">COLLATERAL</span>
                    <h3>Deposit your stock</h3>
                  </div>

                  <span className="flow-description">
                    Keep your exposure while unlocking liquidity.
                  </span>
                </div>

                <div className="input-action">
                  <input
                    type="number"
                    placeholder="sTSLA amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />

                  <button
                    onClick={() => lending.deposit(Number(depositAmount))}
                    disabled={!connected}
                  >
                    Deposit
                  </button>
                </div>
              </div>
            </div>

            <div className="flow-step">
              <div className="flow-number">03</div>

              <div className="flow-content">
                <div className="flow-heading">
                  <div>
                    <span className="eyebrow">LIQUIDITY</span>
                    <h3>Borrow USDC</h3>
                  </div>

                  <span className="flow-description">
                    Borrow against your deposited tokenized stock.
                  </span>
                </div>

                <div className="input-action">
                  <input
                    type="number"
                    placeholder="USDC amount"
                    value={borrowAmount}
                    onChange={(e) => setBorrowAmount(e.target.value)}
                  />

                  <button
                    onClick={() => lending.borrow(Number(borrowAmount))}
                    disabled={!connected}
                  >
                    Borrow USDC
                  </button>
                </div>
              </div>
            </div>

            <div className="repay-row">
              <div>
                <span className="eyebrow">MANAGE POSITION</span>
                <strong>Repay borrowed USDC</strong>
              </div>

              <div className="small-action">
                <input
                  type="number"
                  placeholder="USDC"
                  value={repayAmount}
                  onChange={(e) => setRepayAmount(e.target.value)}
                />

                <button
                  onClick={() => lending.repay(Number(repayAmount))}
                  disabled={!connected}
                >
                  Repay
                </button>
              </div>
            </div>
          </div>

          {dbc.status && (
            <div className={`status ${dbc.status.type}`}>
              {dbc.status.msg}
            </div>
          )}

          {lending.status && (
            <div className={`status ${lending.status.type}`}>
              {lending.status.msg}
            </div>
          )}

        </section>

        {/* HOW IT WORKS */}
        <section className="content-section" id="how">
          <div className="section-intro">
            <span className="eyebrow">HOW IT WORKS</span>
            <h2>From stock exposure<br />to usable liquidity.</h2>
          </div>

          <div className="feature-grid">

            <div className="feature-card">
              <span className="feature-number">01</span>
              <h3>Buy on-chain</h3>
              <p>
                Acquire tokenized stock through a live Solana liquidity
                curve with transparent on-chain price discovery.
              </p>
            </div>

            <div className="feature-card">
              <span className="feature-number">02</span>
              <h3>Keep your exposure</h3>
              <p>
                Instead of selling your tokenized stock when you need
                liquidity, deposit it as collateral.
              </p>
            </div>

            <div className="feature-card">
              <span className="feature-number">03</span>
              <h3>Unlock liquidity</h3>
              <p>
                Borrow stablecoins against your position while keeping
                your tokenized stock exposure.
              </p>
            </div>

          </div>
        </section>

        {/* SIMPLE VALUE SECTION */}
        <section className="value-section">
          <div>
            <span className="eyebrow">THE IDEA</span>
            <h2>
              We didn't just tokenize the stock.
              <br />
              We made it usable.
            </h2>
          </div>

          <p>
            Stock-Lend connects tokenized assets, on-chain liquidity
            and collateralized borrowing into one simple flow.
          </p>
        </section>

        {/* FAQ */}
        <section className="faq-section" id="faq">
          <div className="section-intro">
            <span className="eyebrow">FAQ</span>
            <h2>Everything in one place.</h2>
          </div>

          <div className="faq-list">
            <details>
              <summary>What is Stock-Lend?</summary>
              <p>
                Stock-Lend lets users acquire tokenized stocks on Solana
                and use those assets as collateral for borrowing.
              </p>
            </details>

            <details>
              <summary>Why use tokenized stock as collateral?</summary>
              <p>
                Instead of selling your tokenized stock to access liquidity,
                you can keep the position and borrow against it.
              </p>
            </details>

            <details>
              <summary>How is the stock acquired?</summary>
              <p>
                sTSLA is currently acquired through a Meteora Dynamic
                Bonding Curve, providing transparent on-chain price discovery.
              </p>
            </details>

            <details>
              <summary>Is this a live mainnet product?</summary>
              <p>
                This Stocklana submission is currently a devnet demonstration
                of the complete on-chain flow.
              </p>
            </details>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="brand">
          <span className="brand-mark">S</span>
          <span className="brand-name">Stock-Lend</span>
        </div>

        <span>Built on Solana · Stock-lend 2026</span>
      </footer>

    </div>
  )
}

export default App

