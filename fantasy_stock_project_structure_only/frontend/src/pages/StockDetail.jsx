// frontend/src/pages/StockDetail.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

function StockDetail() {
  const { symbol } = useParams();
  const [stock, setStock] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchStockDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/stocks/detail/${symbol}/`, {
          headers: { Authorization: `Token ${token}` }
        });
        setStock(res.data);
      } catch (err) {
        setMessage('Failed to load stock data');
      }
    };
    fetchStockDetail();
  }, [symbol]);

  const handleAction = async (action) => {
    setMessage('');
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setMessage('수량을 1 이상으로 입력하세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // ✅ 액션별로 엔드포인트 분리
      const endpoint = action === 'buy' ? '/api/stocks/buy/' : '/api/stocks/sell/';

      const res = await axios.post(
        endpoint,
        {
          symbol,
          shares: qty,
          // is_buy 제거: 백엔드가 URL 이름(buy/sell)로 자동 판별
        },
        {
          headers: { Authorization: `Token ${token}` }
        }
      );
      setMessage(res.data.status || res.data.message || (action === 'buy' ? '매수 완료' : '매도 완료'));
      setQuantity('');
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Trade failed.';
      setMessage(errMsg);
    }
  };

  if (!stock) return <p>Loading...</p>;

  // 숫자 안전 표시
  const close = Number(stock.close ?? 0);
  const high = Number(stock.high ?? 0);
  const low = Number(stock.low ?? 0);
  const volume = Number(stock.volume ?? 0);

  return (
    <div className="container mt-5">
      <h2>{symbol} Details</h2>
      <p><strong>Close:</strong> ${close.toFixed(2)}</p>
      <p><strong>High:</strong> ${high.toFixed(2)}</p>
      <p><strong>Low:</strong> ${low.toFixed(2)}</p>
      <p><strong>Volume:</strong> {volume.toLocaleString()}</p>

      <div className="form-group mt-4">
        <label>Quantity:</label>
        <input
          type="number"
          className="form-control"
          value={quantity}
          min={1}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="수량 입력"
        />
      </div>

      <div className="mt-3">
        <button className="btn btn-success me-2" onClick={() => handleAction('buy')}>Buy</button>
        <button className="btn btn-danger" onClick={() => handleAction('sell')}>Sell</button>
      </div>

      {message && <div className="alert alert-info mt-4">{message}</div>}
      <p className="text-muted mt-2">
        * 리그 선택 없이 현재 활성 리그 기준으로 거래가 처리됩니다.
      </p>
    </div>
  );
}

export default StockDetail;
