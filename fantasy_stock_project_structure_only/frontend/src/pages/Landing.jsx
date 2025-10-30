import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div id="fs-landing" className="fs-landing fs-page fs-page--no-sidebar">
      {/* ── Header */}
      <header className="fs-landing__top">
        <div className="brand">
          <div className="logo">G</div>
          <span className="name">GROWLIO</span>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => navigate('/login')}>Login</button>
          <button className="btn primary" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </header>

      {/* ── HERO */}
      <section className="hero">
        <div className="hero__text">
          <span className="pill">Perfect for beginners</span>
          <h1>Master stock trading</h1>
          <p>
            Start with $100,000 virtual money and learn trading with real market data.
            Perfect for students who want to understand finance and the stock market.
          </p>
          <div className="hero__cta">
            <button className="btn ghost" onClick={() => navigate('/market')}>Learn More</button>
          </div>
        </div>

        <div className="hero__image-placeholder">{/* hero visual slot */}</div>
      </section>

      {/* hero__art band */}
      <div className="hero__art">
        <div className="hero__art-frame">
          <div className="hero__stage">

            {/* Portfolio block */}
            <div className="portfolio-block">
              <h3 className="portfolio-block__title">Your Portfolio</h3>

              <div className="portfolio-block__rowwrap">
                {/* tile 1 */}
                <div className="pf-tile">
                  <div className="pf-left">
                    <div className="pf-avatar" aria-hidden>
                      <div className="pf-avatar__img" />
                    </div>
                    <div className="pf-meta">
                      <div className="pf-sym">AAPL</div>
                      <div className="pf-name">Apple Inc</div>
                    </div>
                  </div>
                  <div className="pf-right">
                    <div className="pf-value">$1,232.00</div>
                    <div className="pf-change neg">
                      <span className="arrow">↘</span>
                      <span className="pct">0.12%</span>
                    </div>
                  </div>
                </div>

                {/* tile 2 */}
                <div className="pf-tile">
                  <div className="pf-left">
                    <div className="pf-avatar" aria-hidden>
                      <div className="pf-avatar__img" />
                    </div>
                    <div className="pf-meta">
                      <div className="pf-sym">TSLA</div>
                      <div className="pf-name">Tesla Inc</div>
                    </div>
                  </div>
                  <div className="pf-right">
                    <div className="pf-value">$412.27</div>
                    <div className="pf-change pos">
                      <span className="arrow">↗</span>
                      <span className="pct">3.45%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stocks table block */}
            <div className="stocks-block">
              <div className="stocks-table">
                <div className="stocks-head">
                  <div className="stocks-head-stocks">Stocks</div>
                  <div>Quantity</div>
                  <div>Avg. Cost($)</div>
                  <div>Current Price($)</div>
                  <div>Market Value($)</div>
                </div>

                {[
                  { s: 'AAPL', q: 10, c: 150.0, p: 172.32, v: 432.0 },
                  { s: 'TSLA', q: 5,  c: 160.0, p: 182.45, v: 450.0 },
                  { s: 'AMZN', q: 3,  c: 170.0, p: 193.56, v: 475.0 },
                  { s: 'GOOGL',q: 1,  c: 180.0, p: 204.67, v: 500.0 },
                ].map((r, i) => (
                  <div className="stocks-row" key={i}>
                    <div className="stocks-cell stock-with-avatar">
                      <div className="stocks-avatar" />
                      <span className="stocks-symbol">{r.s}</span>
                    </div>
                    <div className="stocks-cell">{r.q}</div>
                    <div className="stocks-cell">{r.c.toFixed(2)}</div>
                    <div className="stocks-cell">{r.p.toFixed(2)}</div>
                    <div className="stocks-cell">{r.v.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Title block */}
      <section className="title-block">
        <h2>Everything you need to start trading</h2>
        <p>Simple, powerful tools built for learning and practice</p>
      </section>

      {/* FEATURES GRID */}
      <section className="features">
        {/* row1 col1 text */}
        <div className="feature">
          <div className="badge blue">Portfolio Analytics</div>
          <h3>Track your performance like a pro</h3>
          <p>
            Monitor your virtual portfolio with detailed analytics.
            See your gains, losses, and overall progress
            with easy-to-understand metrics.
          </p>
          <ul className="checks">
            <li>Real-time portfolio valuation</li>
            <li>Performance analytics</li>
            <li>Detailed profit &amp; loss tracking</li>
          </ul>
        </div>

        {/* row1 col2 card (Portfolio Overview) */}
        <div className="feature card right">
          <div className="feature-inner">
            <div className="overview">
              <div className="t1">Portfolio Overview</div>

              <div className="kv">
                <span className="kv-label">Total Value</span>
                <span className="kv-value">$125,670</span>
              </div>

              <div className="kv">
                <span className="kv-label">Total Return</span>
                <span className="kv-value kv-pos">+$25,670(25.67%)</span>
              </div>

              <div className="kv">
                <span className="kv-label">Rank</span>
                <span className="kv-value kv-pos">#15</span>
              </div>
            </div>
          </div>
        </div>

        {/* row2 col1 card (Top Performers) */}
        <div className="feature card right">
          <div className="feature-inner">
            <div className="toplist">
              <div className="toplist__head">Top Performers</div>

              <div className="toplist__row">
                <div className="rank-badge">#1</div>
                <div className="tp-mid">
                  <div className="tp-name">Changha Lee</div>
                </div>
                <div className="tp-right">
                  <div className="tp-value">$145,780.25</div>
                  <div className="tp-change tp-pos">+25.78%</div>
                </div>
              </div>

              <div className="toplist__row">
                <div className="rank-badge">#2</div>
                <div className="tp-mid">
                  <div className="tp-name">Aiden Park</div>
                </div>
                <div className="tp-right">
                  <div className="tp-value">$145,780.25</div>
                  <div className="tp-change tp-pos">+25.78%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* row2 col2 text */}
        <div className="feature">
          <div className="badge green">Community Learning</div>
          <h3>Learn from successful traders</h3>
          <p>
            Check out other traders’ portfolios and see what strategies work best.
            Learn by watching successful trades and investment decisions.
          </p>
          <ul className="checks">
            <li>View top performers’ portfolios</li>
            <li>Analyze successful strategies</li>
            <li>Leaderboard rankings</li>
          </ul>
        </div>

        {/* row3 col1 text */}
        <div className="feature">
          <div className="badge yellow">Market Data</div>
          <h3>Trade with real market data</h3>
          <p>
            Experience authentic trading with live stock prices and market data.
            Get the real trading experience without any financial risk.
          </p>
          <ul className="checks">
            <li>Real-time stock prices</li>
            <li>Live market movements</li>
            <li>Detailed stock information</li>
          </ul>
        </div>

        {/* row3 col2 card (Market) */}
        <div className="feature card right">
          <div className="feature-inner">
            <div className="market">
              <div className="market__head">Market</div>

              <div className="market__row">
                <div className="mk-left">
                  <div className="dot" />
                  <div className="mk-symbol">AAPL</div>
                </div>
                <div className="mk-mid">$185.25</div>
                <div className="mk-right mk-pos">+1.2%</div>
              </div>

              <div className="market__row">
                <div className="mk-left">
                  <div className="dot" />
                  <div className="mk-symbol">AMZN</div>
                </div>
                <div className="mk-mid">$434.55</div>
                <div className="mk-right mk-neg">-0.21%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <h3>Ready to start your journey?</h3>
        <p>Take the first step toward mastering the market with GROWLIO.</p>
        <div className="cta__btns">
          <button className="btn primary" onClick={() => navigate('/register')}>Get Started</button>
          <button className="btn ghost" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="brand">
          <div className="logo">G</div>
          <span className="name">GROWLIO</span>
        </div>
        <div className="copy">© 2025 GROWLIO. Built for learning and practice</div>
      </footer>
    </div>
  );
}
