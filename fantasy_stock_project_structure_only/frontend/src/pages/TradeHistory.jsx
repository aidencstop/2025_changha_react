// frontend/src/pages/TradeHistory.jsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';                    // ✅ 공통 인스턴스 사용 권장
import { getSelectedLeagueId } from '../utils/league'; // ✅ A단계 유틸

const TradeHistory = () => {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);   // ✅ 중복요청 방지
  const [error, setError] = useState('');
  const loader = useRef(null);

  const fetchHistory = async () => {
    if (loading || !hasMore) return;
    const league_id = getSelectedLeagueId();
    if (!league_id) {
      setError('리그를 먼저 선택하세요.');
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await api.get('/api/stocks/trade-history/', {
        params: { page, league_id },               // ✅ 핵심: league_id 추가
        headers: { Authorization: `Token ${token}` }
      });
      const results = response.data.results ?? [];
      if (results.length > 0) {
        setHistory(prev => [...prev, ...results]);
        setPage(prev => prev + 1);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading trade history:', err);
      setError(err?.response?.data?.error || '거래내역을 불러오지 못했습니다.');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handleObserver = useCallback((entries) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading) {
      fetchHistory();
    }
  }, [hasMore, loading]);

  useEffect(() => {
    const option = { root: null, rootMargin: '20px', threshold: 1.0 };
    const observer = new IntersectionObserver(handleObserver, option);
    if (loader.current) observer.observe(loader.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => { fetchHistory(); }, []);        // 첫 페이지 로딩

  return (
    <div className="container mt-4">
      <h2>📘 Trade History</h2>
      {error && <div className="alert alert-warning">{error}</div>}
      <ul className="list-group">
        {history.map((trade, index) => (
          <li key={index} className="list-group-item">
            <strong>{trade.symbol}</strong> - {(trade.trade_type || (trade.is_buy ? 'BUY' : 'SELL')).toUpperCase()} - {trade.quantity ?? trade.shares}주 @ {trade.price}$
            <br />
            <small>{new Date(trade.timestamp).toLocaleString()}</small>
          </li>
        ))}
      </ul>
      <div ref={loader} style={{ height: '30px' }} />
      {loading && <div className="text-center my-3">불러오는 중...</div>}
      {!hasMore && <div className="text-center my-3 text-muted">더 이상 내역이 없습니다.</div>}
    </div>
  );
};

export default TradeHistory;
