// frontend/src/pages/MarketOverview.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MarketOverview() {
  const [stocks, setStocks] = useState([]);
  const [visible, setVisible] = useState([]); // ✅ 화면에 보여줄 리스트
  const [q, setQ] = useState('');             // ✅ 검색 입력값
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
      setVisible(res.data); // ✅ 최초엔 전체 노출
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

  // ✅ 검색 실행 (돋보기 버튼/Enter)
  const handleSearch = () => {
    const term = q.trim().toLowerCase();
    if (!term) {
      // 입력이 비어있으면 그대로 두고, '전체' 버튼으로 초기화하도록 유지
      return;
    }
    const filtered = stocks.filter((s) => {
      const name = String(s.name || '').toLowerCase();
      const sym  = String(s.symbol || '').toLowerCase();
      return name.includes(term) || sym.includes(term);
    });
    setVisible(filtered);
  };

  // ✅ 전체 버튼: 다시 전체 리스트
  const handleShowAll = () => {
    setVisible(stocks);
    setQ('');
  };

  // Enter 키로도 검색
  const onKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="container mt-5">
      <h2>📊 Market Overview</h2>

      {/* ✅ 검색창 + 돋보기 + 전체 */}
      <div className="d-flex gap-2 align-items-center mt-3">
        <input
          className="form-control"
          style={{ maxWidth: 320 }}
          placeholder="Name 또는 Symbol로 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="btn btn-primary" onClick={handleSearch}>
          🔍
        </button>
        <button className="btn btn-outline-secondary" onClick={handleShowAll}>
          전체
        </button>
      </div>

      {loading && <p className="mt-3">⏳ 로딩 중...</p>}
      {error && <p className="text-danger mt-3">{error}</p>}

      {!loading && !error && (
        <table className="table table-hover mt-3">
          <thead className="table-light">
            <tr>
              <th>#</th> {/* Row 번호 열 */}
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
                <td colSpan={7} className="text-center text-muted">
                  검색 결과가 없습니다.
                </td>
              </tr>
            ) : (
              visible.map((stock, idx) => (
                <tr
                  key={`${stock.symbol}-${idx}`}
                  onClick={() => handleClick(stock.symbol)}
                  style={{ cursor: 'pointer' }}
                  className="table-row"
                >
                  <td>{idx + 1}</td>
                  <td>{stock.name}</td>
                  <td>{stock.symbol}</td>
                  <td>{Number(stock.close).toFixed(2)}</td>
                  <td>{Number(stock.high).toFixed(2)}</td>
                  <td>{Number(stock.low).toFixed(2)}</td>
                  <td>{Number(stock.volume).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MarketOverview;
