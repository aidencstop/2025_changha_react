import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Landing.css';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div id="fs-landing" className="fs-landing fs-page fs-page--no-sidebar">
      {/* ── Header bar처럼 상단 여백/정렬만 맞춤 (전역 Sidebar와 공존 X: no-sidebar) */}
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

  {/* ⬇️ 오른쪽 영역: 이미지 자리만 남김 */}
  <div className="hero__image-placeholder">
    {/* 여기에 나중에 hero 이미지 들어감 */}
  </div>
</section>

{/* ⬇️ hero__art 전체를 hero 섹션 밖으로 이동 — 단독 한 줄 전폭 */}
<div className="hero__art">
  <div className="hero__art-frame">
    <div className="hero__art-inner">
      {/* 카드 1: 작은 포트폴리오 */}
      <div className="card mini">
        <div className="mini__row">
          <div className="avatar">A</div>
          <div className="meta">
            <div className="t1">AAPL</div>
            <div className="t2">Apple Inc</div>
          </div>
          <div className="val">$1,222.09</div>
          <div className="chg neg">-0.31%</div>
        </div>
        <div className="mini__row">
          <div className="avatar">A</div>
          <div className="meta">
            <div className="t1">TSLA</div>
            <div className="t2">Tesla Inc</div>
          </div>
          <div className="val">$1,782.29</div>
          <div className="chg pos">+1.26%</div>
        </div>
      </div>

      {/* 카드 2: 테이블 */}
      <div className="card table">
        <div className="table__head">
          <div>Stocks</div><div>Qty</div><div>Avg. Cost($)</div><div>Current($)</div><div>Market Value($)</div>
        </div>
        {[
          { s: 'AAPL', q: 10, c: 150.0, p: 172.32, v: 432.0 },
          { s: 'TSLA', q: 5, c: 160.0, p: 182.45, v: 450.0 },
          { s: 'AMZN', q: 3, c: 170.0, p: 193.56, v: 475.0 },
          { s: 'GOOGL', q: 1, c: 180.0, p: 204.67, v: 500.0 },
        ].map((r, i) => (
          <div className="table__row" key={i}>
            <div className="stk"><span className="dot" /> {r.s}</div>
            <div>{r.q}</div>
            <div>{r.c.toFixed(2)}</div>
            <div>{r.p.toFixed(2)}</div>
            <div>{r.v.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
</div>

      {/* ── SECTION TITLE */}
      <section className="title-block">
        <h2>Everything you need to start trading</h2>
        <p>Simple, powerful tools built for learning and practice</p>
      </section>

      {/* ── FEATURES GRID */}
      <section className="features">
        {/* Portfolio Analytics */}
        <div className="feature">
          <div className="badge blue">Portfolio Analytics</div>
          <h3>Track your performance like a pro</h3>
          <p>
            Monitor your virtual portfolio with detailed analytics. See your gains,
            losses, and overall progress with easy-to-understand metrics.
          </p>
          <ul className="checks">
            <li>Real-time portfolio valuation</li>
            <li>Performance analytics</li>
            <li>Detailed profit &amp; loss tracking</li>
          </ul>
        </div>
        <div className="feature card right">
          <div className="overview">

            <div className="meta">
              <div className="t1">Portfolio Overview</div>
              <div className="kv">
                <span>Total Value</span><b>$125,670</b>
              </div>
              <div className="kv">
                <span>Total Return</span><b className="pos">+25,670 (25.67%)</b>
              </div>
              <div className="kv">
                <span>Rank</span><b>#15</b>
              </div>
            </div>
          </div>
        </div>

        {/* Community Learning */}
        <div className="feature card right">
          <div className="toplist">
            <div className="toplist__head">Top Performers</div>
            <div className="toplist__row">
              <div className="rank gold">#1</div>
              <div className="name">Changha Lee</div>
              <div className="pnl">$145,780.25 <span className="pos">+25.7%</span></div>
            </div>
            <div className="toplist__row">
              <div className="rank silver">#2</div>
              <div className="name">Aiden Park</div>
              <div className="pnl">$145,760.25 <span className="pos">+25.3%</span></div>
            </div>
          </div>
        </div>
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

        {/* Market Data */}
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
        <div className="feature card right">
          <div className="market">
            <div className="market__head">Market</div>
            <div className="market__row">
              <div className="stk"><span className="dot" />AAPL</div>
              <div className="price">$185.25</div>
              <div className="chg pos">+1.2%</div>
            </div>
            <div className="market__row">
              <div className="stk"><span className="dot" />AMZN</div>
              <div className="price">$434.55</div>
              <div className="chg neg">-0.21%</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA */}
      <section className="cta">
        <h3>Ready to start your journey?</h3>
        <p>Take the first step toward mastering the market with GROWLIO.</p>
        <div className="cta__btns">
          <button className="btn primary" onClick={() => navigate('/register')}>Get Started</button>
          <button className="btn ghost" onClick={() => navigate('/login')}>Sign In</button>
        </div>
      </section>

      {/* ── FOOTER */}
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
