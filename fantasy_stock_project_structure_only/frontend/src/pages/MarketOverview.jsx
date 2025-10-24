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
    if (loading) return; // 로딩 중에는 클릭 비활성화
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

  // 스켈레톤 셀
  const Skel = ({ w = '80%', h = 14 }) => (
    <span
      className="fs-skel"
      style={{
        display: 'inline-block',
        width: w,
        height: h,
        borderRadius: 4
      }}
    />
  );

  // 로딩 중에는 스켈레톤 행 12개로 높이 예약
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
      // 에러가 있어도 테이블 틀 유지 + 한 줄 안내
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
      {/* 여기서 fs-sidebar-spacer는 Navbar.jsx가 렌더링할 때 이미 화면에 들어옴 */}
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

          {/* 테이블은 항상 렌더 → 초기와 로딩 후 비율 동일화 */}
          <div
            className="table-responsive"
            style={{
              // 로딩 중에도 충분한 높이 예약 (행 12개 기준 대략값)
              minHeight: loading ? 520 : undefined
            }}
          >
            <table
              className="fs-table"
              style={{ tableLayout: 'fixed', width: '100%' }}
            >
              {/* 고정 컬럼 폭으로 폭 재분배 최소화 */}
              <colgroup>
                <col style={{ width: 56 }} />
                <col />{/* Name: auto */}
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

          {/* 보조 상태 텍스트는 테이블 외부에 작게 표시 (레이아웃 영향 최소화) */}
          {loading && <p className="mt-2">⏳ Loading...</p>}
        </div>
      </main>

      {/* 스켈레톤용 최소 CSS (컴포넌트 로컬 삽입) */}
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
      `}</style>
    </div>
  );
}

export default MarketOverview;
