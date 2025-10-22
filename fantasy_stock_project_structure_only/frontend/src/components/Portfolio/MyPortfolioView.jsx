import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const MyPortfolioView = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState({
    starting_cash: 0,
    cash: 0,
    total_stock_value: 0,
    total_asset: 0,
    return_pct: 0,
  });
  const navigate = useNavigate();

  const fmt = (n) =>
    typeof n === 'number'
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : (n ?? '').toString();

  const fetchPortfolio = async () => {
    setLoading(true);
    setErr('');
    try {
      const res = await api.get('/stocks/my-portfolio/');
      const data = res.data || {};
      setSummary({
        starting_cash: data.starting_cash ?? 0,
        cash: data.cash ?? 0,
        total_stock_value: data.total_stock_value ?? 0,
        total_asset: data.total_asset ?? 0,
        return_pct: data.return_pct ?? 0,
      });
      setRows(Array.isArray(data.holdings) ? data.holdings : []);
    } catch (e) {
      console.error('MyPortfolioView error:', e?.response || e);
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.error ||
        '포트폴리오를 불러오지 못했습니다';
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPortfolio(); }, []);
  const gotoDetail = (symbol) => navigate(`/stock/${symbol}`);

  if (err) {
    return (
      <div className="alert alert-danger my-3 d-flex justify-content-between align-items-center">
        <span>{err}</span>
        <button className="btn btn-sm btn-outline-light" onClick={fetchPortfolio}>다시 시도</button>
      </div>
    );
  }

  return (
    <div className="fs-portfolio__my">
      {/* Summary tiles (디자인만 변경) */}
      <div className="fs-stats">
        <div className="fs-stat">
          <div className="fs-stat__label">Starting Cash</div>
          <div className="fs-stat__value">${fmt(summary.starting_cash)}</div>
        </div>
        <div className="fs-stat">
          <div className="fs-stat__label">Available Cash</div>
          <div className="fs-stat__value">${fmt(summary.cash)}</div>
        </div>
        <div className="fs-stat">
          <div className="fs-stat__label">Stock Value</div>
          <div className="fs-stat__value">${fmt(summary.total_stock_value)}</div>
        </div>
        <div className="fs-stat">
          <div className="fs-stat__label">Total Asset / Return</div>
          <div className="fs-stat__value">
            ${fmt(summary.total_asset)}{' '}
            <span className={summary.return_pct >= 0 ? 'text-success' : 'text-danger'}>
              ({fmt(summary.return_pct)}%)
            </span>
          </div>
        </div>
      </div>

      {loading && <div className="text-muted">불러오는 중…</div>}
      {!loading && rows.length === 0 && <div className="fs-empty">보유 종목이 없습니다.</div>}

      {!loading && rows.length > 0 && (
        <div className="fs-card fs-portfolio__table">
          <table className="fs-table">
            <thead>
              <tr>
      <th style={{ width: '5%' }}>#</th>
      <th style={{ width: '12%' }}>Stocks</th>
      <th style={{ width: '10%' }}>Quantity</th>
      <th style={{ width: '10%' }}>Avg. Cost($)</th>
      <th style={{ width: '13%' }}>Current Price($)</th>
      <th style={{ width: '13%' }}>Market Value($)</th>
      <th style={{ width: '23%' }}>Gain/Loss</th>
      <th style={{ width: '15%' }} className="text-end">Action</th>
    </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr className="fs-row" key={`${r.symbol}-${i}`}>
                  <td>{i + 1}</td>
                  <td>{r.symbol}</td>
                  <td>{fmt(r.quantity)}</td>
                  <td>${fmt(r.avg_price)}</td>
                  <td>${fmt(r.current_price)}</td>
                  <td>${fmt(r.evaluation)}</td>
                  <td className={r.pnl >= 0 ? 'text-success' : 'text-danger'}>
                    {r.pnl >= 0 ? '+' : ''}${fmt(r.pnl)} / {fmt(r.pnl_pct)}%
                  </td>
                  <td className="text-end">
                    <button className="fs-btn fs-btn-primary fs-btn--xs" onClick={() => gotoDetail(r.symbol)}>
                      Buy
                    </button>
                    {' '}
                    <button className="fs-btn fs-btn-ghost fs-btn--xs" onClick={() => gotoDetail(r.symbol)}>
                      Sell
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MyPortfolioView;
