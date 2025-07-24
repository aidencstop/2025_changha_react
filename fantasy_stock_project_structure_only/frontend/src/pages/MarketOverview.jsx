import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MarketOverview() {
  const [stocks, setStocks] = useState([]);
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

  return (
    <div className="container mt-5">
      <h2>📊 Market Overview</h2>

      {loading && <p>⏳ 로딩 중...</p>}
      {error && <p className="text-danger">{error}</p>}

      {!loading && stocks.length === 0 && (
        <p>🙁 오늘의 시장 데이터가 아직 준비되지 않았습니다.</p>
      )}

      {!loading && stocks.length > 0 && (
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
            {stocks.map((stock, idx) => (
              <tr
                key={idx}
                onClick={() => handleClick(stock.symbol)}
                style={{ cursor: 'pointer' }}
                className="table-row"
              >
                <td>{idx + 1}</td> {/* 번호 표시 */}
                <td>{stock.name}</td>
                <td>{stock.symbol}</td>
                <td>{stock.close.toFixed(2)}</td>
                <td>{stock.high.toFixed(2)}</td>
                <td>{stock.low.toFixed(2)}</td>
                <td>{stock.volume.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default MarketOverview;
