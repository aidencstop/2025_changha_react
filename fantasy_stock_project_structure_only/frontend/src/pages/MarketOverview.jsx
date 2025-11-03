import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MarketOverview() {
  const [stocks, setStocks] = useState([]);
  const [visible, setVisible] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMarket();
  }, []);

  const fetchMarket = async () => {
    try {
      const res = await axios.get('/api/stocks/overview/', {
        headers: {
          Authorization: `Token ${localStorage.getItem('token')}`
        }
      });
      setStocks(res.data);
      setVisible(res.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load market data', err);
      setError('📉 Unable to retrieve market data.');
      setLoading(false);
    }
  };

  const handleClick = (symbol) => {
    if (loading) return;
    navigate(`/stock/${symbol}`);
  };

  const handleSearch = () => {
    const term = q.trim().toLowerCase();
    if (!term) return;
    const filtered = stocks.filter((s) => {
      const name = String(s.name || '').toLowerCase();
      const sym  = String(s.symbol || '').toLowerCase();
      return name.includes(term) || sym.includes(term);
    });
    setVisible(filtered);
  };

  const handleShowAll = () => {
    setVisible(stocks);
    setQ('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const Skel = ({ w = '80%', h = 14 }) => (
    <span
      className="fs-skel"
      style={{ display: 'inline-block', width: w, height: h, borderRadius: 4 }}
    />
  );

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: 12 }).map((_, i) => (
        <tr key={`skel-${i}`} className="fs-row">
          <td><Skel w="24px" /></td>
          <td><Skel w="60%" /></td>
          <td className="fs-mono"><Skel w="70px" /></td>
          <td><Skel w="72px" /></td>
          <td><Skel w="72px" /></td>
          <td><Skel w="72px" /></td>
          <td><Skel w="100px" /></td>
        </tr>
      ));
    }

    if (error) {
      return (
        <tr>
          <td colSpan={7} className="fs-empty">
            {error}
          </td>
        </tr>
      );
    }

    if (visible.length === 0) {
      return (
        <tr>
          <td colSpan={7} className="fs-empty">
            No search results.
          </td>
        </tr>
      );
    }

    return visible.map((stock, idx) => (
      <tr
        key={`${stock.symbol}-${idx}`}
        onClick={() => handleClick(stock.symbol)}
        className="fs-row"
        style={{ cursor: 'pointer' }}
      >
        <td>{idx + 1}</td>
        <td>{stock.name}</td>
        <td className="fs-mono">{stock.symbol}</td>
        <td>{Number(stock.close).toFixed(2)}</td>
        <td>{Number(stock.high).toFixed(2)}</td>
        <td>{Number(stock.low).toFixed(2)}</td>
        <td>{Number(stock.volume).toLocaleString()}</td>
      </tr>
    ));
  };

  return (
    <div className="fs-layout">
      <main className="fs-page fs-page--fluid">
        <div className="fs-page-header">
          <div>
            <h2 className="fs-title">Market Overview</h2>
            <p className="fs-sub">See overall market status here</p>
          </div>
        </div>

        <div className="fs-card">
          <div className="fs-card-head">
            <div className="fs-card-title">Stock Lists</div>

            <div className="fs-search">
              <span className="fs-search-icon" aria-hidden>🔍</span>
              <input
                className="fs-search-input"
                placeholder="Search by Name or Symbol"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
              />
              <button
                className="fs-btn fs-btn-primary"
                onClick={handleSearch}
                disabled={loading}
              >
                Search
              </button>
              <button
                className="fs-btn fs-btn-ghost"
                onClick={handleShowAll}
                disabled={loading}
              >
                All
              </button>
            </div>
          </div>

          <div
            className="table-responsive"
            style={{ minHeight: loading ? 520 : undefined }}
          >
            <table className="fs-table" style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: 56 }} />
                <col />
                <col style={{ width: 120 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 140 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Symbol</th>
                  <th>Close</th>
                  <th>High</th>
                  <th>Low</th>
                  <th>Volume</th>
                </tr>
              </thead>
              <tbody>{renderBody()}</tbody>
            </table>
          </div>

          {loading && <p className="mt-2">⏳ Loading...</p>}
        </div>
      </main>

      {/* ▼▼▼ 로딩 모달 (loading === true일 때만 표시) ▼▼▼ */}
      {loading && (
        <div
          className="fs-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fs-loading-title"
        >
          <div className="fs-modal">
            <div className="fs-spinner" aria-hidden="true" />
            <h3 id="fs-loading-title">Loading data...</h3>
            <p>This may take up to a minute.</p>
          </div>
        </div>
      )}

      {/* 스켈레톤 & 모달용 최소 CSS */}
      <style>{`
        .fs-skel {
          background: linear-gradient(90deg, rgba(0,0,0,0.08), rgba(0,0,0,0.14), rgba(0,0,0,0.08));
          background-size: 200% 100%;
          animation: fs-skel-shimmer 1.2s ease-in-out infinite;
        }
        @keyframes fs-skel-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: 0 0; }
        }

        .fs-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .fs-modal {
          background: #fff;
          border-radius: 12px;
          padding: 24px 28px;
          width: 360px;
          max-width: 90vw;
          text-align: center;
          box-shadow: 0 8px 28px rgba(0,0,0,0.18);
        }
        .fs-modal h3 {
          margin: 12px 0 6px;
          font-size: 18px;
        }
        .fs-modal p {
          margin: 0;
          font-size: 14px;
          color: #444;
        }
        .fs-spinner {
          width: 36px;
          height: 36px;
          border: 4px solid rgba(0,0,0,0.1);
          border-top-color: rgba(0,0,0,0.6);
          border-radius: 50%;
          margin: 0 auto 8px;
          animation: fs-spin 0.9s linear infinite;
        }
        @keyframes fs-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default MarketOverview;
