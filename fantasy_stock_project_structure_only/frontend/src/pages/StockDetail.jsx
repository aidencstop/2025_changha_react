import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

function StockDetail() {
  const { symbol } = useParams();
  const [stock, setStock] = useState(null);
  const [quantity, setQuantity] = useState(0);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchStockDetail();
  }, []);

  const fetchStockDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/stocks/detail/${symbol}/`, {
        headers: {
          Authorization: `Token ${token}`
        }
      });
      setStock(res.data);
    } catch (err) {
      setMessage('Failed to load stock data');
    }
  };

  const handleAction = async (action) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/stocks/${action}/`, {
        symbol,
        shares: parseInt(quantity),
        is_buy: action === 'buy'
      }, {
        headers: {
          Authorization: `Token ${token}`
        }
      });
      setMessage(res.data.status || res.data.message);
    } catch (err) {
      if (err.response?.data?.error) {
        setMessage(err.response.data.error);
      } else {
        setMessage('Trade failed.');
      }
    }
  };

  if (!stock) return <p>Loading...</p>;

  return (
    <div className="container mt-5">
      <h2>{symbol} Details</h2>
      <p><strong>Close:</strong> ${stock.close.toFixed(2)}</p>
      <p><strong>High:</strong> ${stock.high.toFixed(2)}</p>
      <p><strong>Low:</strong> ${stock.low.toFixed(2)}</p>
      <p><strong>Volume:</strong> {stock.volume.toLocaleString()}</p>

      <div className="form-group mt-4">
        <label>Quantity:</label>
        <input
          type="number"
          className="form-control"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
        />
      </div>

      <div className="mt-3">
        <button className="btn btn-success me-2" onClick={() => handleAction('buy')}>Buy</button>
        <button className="btn btn-danger" onClick={() => handleAction('sell')}>Sell</button>
      </div>

      {message && <div className="alert alert-info mt-4">{message}</div>}
    </div>
  );
}

export default StockDetail;
