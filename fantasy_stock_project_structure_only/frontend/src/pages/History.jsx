import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';

function History() {
  const [history, setHistory] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loader = useRef(null);

  useEffect(() => {
    fetchHistory(page);
  }, [page]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (loader.current) observer.observe(loader.current);
    return () => {
      if (loader.current) observer.unobserve(loader.current);
    };
  }, [hasMore]);

  const fetchHistory = async (pageNum) => {
    try {
      const res = await axios.get(`/api/stocks/history/?page=${pageNum}`);
      if (res.data.results.length > 0) {
        setHistory(prev => [...prev, ...res.data.results]);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Failed to fetch history');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Trade History</h2>
      <ul className="list-group mt-3">
        {history.map((item, index) => (
          <li key={index} className="list-group-item">
            {item.stock_symbol} – {item.action.toUpperCase()} {item.quantity} shares at ${item.price.toFixed(2)} on {item.date}
          </li>
        ))}
      </ul>
      <div ref={loader} className="text-center mt-3">
        {hasMore && <p>Loading more...</p>}
      </div>
    </div>
  );
}

export default History;
