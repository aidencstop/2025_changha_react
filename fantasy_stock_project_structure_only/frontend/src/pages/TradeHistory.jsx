// frontend/src/pages/TradeHistory.jsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';

const TradeHistory = () => {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef(null);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/stocks/trade-history/?page=${page}`, {
        headers: {
          Authorization: `Token ${token}`
        }
      });
      if (response.data.results.length > 0) {
        setHistory(prev => [...prev, ...response.data.results]);
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading trade history:', error);
    }
  };

  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore) {
      fetchHistory();
    }
  }, [hasMore]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: '20px',
      threshold: 1.0
    };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loader.current) observer.observe(loader.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    fetchHistory(); // 첫 페이지 로딩
  }, []);

  return (
    <div className="container mt-4">
      <h2>📘 Trade History</h2>
      <ul className="list-group">
        {history.map((trade, index) => (
          <li key={index} className="list-group-item">
            <strong>{trade.symbol}</strong> - {trade.trade_type.toUpperCase()} - {trade.quantity}주 @ {trade.price}$
            <br />
            <small>{new Date(trade.timestamp).toLocaleString()}</small>
          </li>
        ))}
      </ul>
      <div ref={loader} style={{ height: '30px' }} />
    </div>
  );
};

export default TradeHistory;
