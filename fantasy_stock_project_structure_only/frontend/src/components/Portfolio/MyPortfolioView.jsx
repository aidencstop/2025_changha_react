// frontend/src/components/Portfolio/MyPortfolioView.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // ✅ 추가
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

  const navigate = useNavigate(); // ✅ 추가

  const fmt = (n) =>
    typeof n === 'number'
      ? n.toLocaleString(undefined, { maximumFractionDigits: 2 })
      : (n ?? '').toString();

  const fetchPortfolio = async () => {
    setLoading(true);
    setErr('');
    try {
      // ✅ 활성 리그 자동 해석을 사용하는 기존 백엔드 엔드포인트
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

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const gotoDetail = (symbol) => {
    // 🔽 프로젝트 라우트에 맞게 이 한 줄만 필요 시 변경
    // 예: '/stock/:symbol'을 쓰면 navigate(`/stock/${symbol}`);
    navigate(`/stock/${symbol}`);
  };

  if (err) {
    return (
      <div className="alert alert-danger my-3 d-flex justify-content-between align-items-center">
        <span>{err}</span>
        <button className="btn btn-sm btn-outline-light" onClick={fetchPortfolio}>
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* 요약 카드 */}
      <div className="row g-3 mb-3">
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">시작 현금</div>
              <div className="fs-5 fw-semibold">${fmt(summary.starting_cash)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">현금</div>
              <div className="fs-5 fw-semibold">${fmt(summary.cash)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">보유주식 평가</div>
              <div className="fs-5 fw-semibold">${fmt(summary.total_stock_value)}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card h-100">
            <div className="card-body">
              <div className="text-muted small">총자산 / 수익률</div>
              <div className="fs-5 fw-semibold">
                ${fmt(summary.total_asset)}{' '}
                <span className={summary.return_pct >= 0 ? 'text-success' : 'text-danger'}>
                  ({fmt(summary.return_pct)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && <div>불러오는 중…</div>}

      {!loading && rows.length === 0 && (
        <div className="text-muted">보유 종목이 없습니다.</div>
      )}

      {!loading && rows.length > 0 && (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>#</th>
              <th>티커</th>
              <th>수량</th>
              <th>평단</th>
              <th>현재가</th>
              <th>평가금액</th>
              <th>PnL</th>
              <th>PnL%</th>
              <th className="text-end">액션</th>{/* ✅ 추가 */}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.symbol}-${i}`}>
                <td>{i + 1}</td>
                <td>{r.symbol}</td>
                <td>{fmt(r.quantity)}</td>
                <td>${fmt(r.avg_price)}</td>
                <td>${fmt(r.current_price)}</td>
                <td>${fmt(r.evaluation)}</td>
                <td className={r.pnl >= 0 ? 'text-success' : 'text-danger'}>${fmt(r.pnl)}</td>
                <td className={r.pnl_pct >= 0 ? 'text-success' : 'text-danger'}>{fmt(r.pnl_pct)}%</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => gotoDetail(r.symbol)}
                  >
                    (Buy/Sell)
                  </button>
                </td>{/* ✅ 추가 */}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default MyPortfolioView;
