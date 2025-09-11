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
      setError('📉 시장 데이터를 불러올 수 없습니다.');
      setLoading(false);
    }
  };

  const handleClick = (symbol) => {
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
              />
              <button className="fs-btn fs-btn-primary" onClick={handleSearch}>
                Search
              </button>
              <button className="fs-btn fs-btn-ghost" onClick={handleShowAll}>
                전체
              </button>
            </div>
          </div>

          {loading && <p className="mt-2">⏳ 로딩 중...</p>}
          {error && <p className="text-danger mt-2">{error}</p>}

          {!loading && !error && (
            <div className="table-responsive">
              <table className="fs-table">
                <thead>
                  <tr>
                    <th style={{width: 56}}>#</th>
                    <th>Name</th>
                    <th>Symbol</th>
                    <th>Close</th>
                    <th>High</th>
                    <th>Low</th>
                    <th>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="fs-empty">
                        검색 결과가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    visible.map((stock, idx) => (
                      <tr
                        key={`${stock.symbol}-${idx}`}
                        onClick={() => handleClick(stock.symbol)}
                        className="fs-row"
                      >
                        <td>{idx + 1}</td>
                        <td>{stock.name}</td>
                        <td className="fs-mono">{stock.symbol}</td>
                        <td>{Number(stock.close).toFixed(2)}</td>
                        <td>{Number(stock.high).toFixed(2)}</td>
                        <td>{Number(stock.low).toFixed(2)}</td>
                        <td>{Number(stock.volume).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default MarketOverview;
