// frontend/src/pages/StockDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

function StockDetail() {
  const { symbol } = useParams();
  const [stock, setStock] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [side, setSide] = useState('buy'); // 'buy' | 'sell'  (UI 토글만 추가, 로직 변경 없음)

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

  const close = Number(stock?.close ?? 0);
  const high = Number(stock?.high ?? 0);
  const low = Number(stock?.low ?? 0);
  const volume = Number(stock?.volume ?? 0);

  const qtyNum = Number.isFinite(parseInt(quantity, 10)) ? parseInt(quantity, 10) : 0;
  const total = useMemo(() => (qtyNum > 0 ? qtyNum * close : 0), [qtyNum, close]);

  const handleAction = async (action) => {
    setMessage('');
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setMessage('수량을 1 이상으로 입력하세요.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = action === 'buy' ? '/api/stocks/buy/' : '/api/stocks/sell/';
      const res = await axios.post(
        endpoint,
        { symbol, shares: qty },
        { headers: { Authorization: `Token ${token}` } }
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

  if (!stock) {
    return (
      <div className="fs-layout">
        <main className="fs-page fs-page--fluid">
          <div className="fs-page-header">
            <div>
              <h2 className="fs-title">Loading…</h2>
              <p className="fs-sub">Fetching {symbol} details</p>
            </div>
          </div>
          <div className="fs-card">
            <div className="fs-card-head">
              <div className="fs-card-title">Stock Detail</div>
            </div>
            <div className="fs-card-body">
              <p className="text-muted">⏳ 불러오는 중…</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // 시각 표현 보조
  const fmtMoney = (v) =>
    isFinite(v) ? `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  const fmtInt = (v) => (isFinite(v) ? Number(v).toLocaleString() : '—');

  return (
    <div className="fs-layout">
      <main className="fs-page fs-page--fluid">
        {/* 상단 네비 헤더(좌측 Back, 우측 잔고)는 프로젝트 전역 Navbar가 담당한다고 가정 */}
        <div className="fs-page-header">
          <div>
            <h2 className="fs-title">{stock?.name || symbol}</h2>
            <p className="fs-sub">{symbol}</p>
          </div>
        </div>

        {/* 상단: 좌(종목 카드) / 우(주문 카드) */}
        <div className="row g-4">
          {/* 좌측 큰 종목 카드 */}
          <div className="col-12 col-lg-8">
            <div className="fs-card">
              <div className="fs-card-body">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="d-flex align-items-center gap-3">
                      <h1 className="m-0" style={{ fontWeight: 800, letterSpacing: -0.3 }}>
                        {stock?.name || symbol}
                      </h1>
                      <div className="text-muted">
                        <div style={{ lineHeight: 1.2, marginTop: 4 }}>
                          <span className="fw-semibold">{symbol}</span>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>{stock?.name}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 d-flex align-items-center gap-3">
                      <div style={{ fontSize: 32, fontWeight: 800 }}>{fmtMoney(close)}</div>
                      {/* 변동률/변동액이 없을 수 있어 배지 형태만 틀 유지 */}
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(255, 68, 68, 0.12)',
                          color: '#dc3545',
                          padding: '8px 10px',
                          borderRadius: 12,
                          fontWeight: 700
                        }}
                      >
                        {/* 예: -0.15% / -0.28 USD */}
                        —
                      </span>
                    </div>

                    <div className="text-muted mt-1" style={{ fontSize: 12 }}>
                      At Close · Latest quote
                    </div>
                  </div>

                  <div className="d-none d-md-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16, minWidth: 260 }}>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        Market Cap
                      </div>
                      <div className="fw-bold" style={{ marginTop: 4 }}>—</div>
                    </div>
                    <div>
                      <div className="text-muted" style={{ fontSize: 12 }}>
                        Volume
                      </div>
                      <div className="fw-bold" style={{ marginTop: 4 }}>{fmtInt(volume)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 우측 주문 패널 */}
          <div className="col-12 col-lg-4">
            <div className="fs-card">
              <div className="fs-card-head">
                <div className="fs-card-title">Order</div>
                {/* Buy / Sell 세그먼트 */}
                <div
                  className="d-inline-flex"
                  style={{
                    background: 'rgba(113, 113, 122, .12)',
                    borderRadius: 999,
                    padding: 4,
                    gap: 4
                  }}
                >
                  <button
                    className={`fs-btn ${side === 'buy' ? 'fs-btn-primary' : 'fs-btn-ghost'}`}
                    onClick={() => setSide('buy')}
                    style={{ borderRadius: 999, minWidth: 72 }}
                  >
                    Buy
                  </button>
                  <button
                    className={`fs-btn ${side === 'sell' ? 'fs-btn-primary' : 'fs-btn-ghost'}`}
                    onClick={() => setSide('sell')}
                    style={{ borderRadius: 999, minWidth: 72 }}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div className="fs-card-body">
                <div
  className="mb-3 d-flex align-items-center"
  style={{ gap: 8, width: '50%' }}
>
  <div className="text-muted" style={{ minWidth: 60 }}>
    Shares
  </div>
  <input
    type="number"
    min={1}
    className="fs-search-input flex-grow-1 text-end"
    placeholder="수량 입력"
    value={quantity}
    onChange={(e) => setQuantity(e.target.value)}
    style={{
      backgroundColor: '#f8f9fa', // 아주 연한 회색
      textAlign: 'right',         // 우측 정렬
      width: '100%'
    }}
  />
</div>

                <div
  className="mb-3 d-flex align-items-center"
  style={{ gap: 8, width: '50%' }}
>
  <div className="text-muted" style={{ minWidth: 60 }}>
    Price
  </div>
  <div
    className="fs-search-input flex-grow-1 text-end"
    style={{
      pointerEvents: 'none',
      color: '#000',          // 검은색 텍스트
      opacity: 1,
      textAlign: 'right',     // 우측 정렬
      width: '100%'
    }}
  >
    {fmtMoney(close)}
  </div>
</div>


                <div className="mb-4 d-flex justify-content-between align-items-center">
                  <div className="text-muted">Total</div>
                  <div className="fw-bold">{fmtMoney(total)}</div>
                </div>

                <button
                  className="fs-btn fs-btn-primary w-100"
                  onClick={() => handleAction(side)}
                >
                  Order
                </button>

                {message && <div className="alert alert-info mt-3 mb-0">{message}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* 중단: Detail Stock */}
        <div className="fs-card mt-4">
          <div className="fs-card-head">
            <div>
              <div className="fs-card-title">Detail Stock</div>
              <div className="text-muted" style={{ fontSize: 12 }}>
                Comprehensive details on individual stocks
              </div>
            </div>
          </div>
          <div className="fs-card-body">
            <div className="row g-4">
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Previous Close</div>
                <div className="fw-semibold mt-1">{fmtMoney(close)}</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Open</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Bid</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Ask</div>
                <div className="fw-semibold mt-1">—</div>
              </div>

              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Volume</div>
                <div className="fw-semibold mt-1">{fmtInt(volume)}</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Avg. Volume</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Market Cap</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>PE Ratio (TTM)</div>
                <div className="fw-semibold mt-1">—</div>
              </div>

              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>EPS (TTM)</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Forward Dividend</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Ex-Dividend Date</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
              <div className="col-6 col-md-3">
                <div className="text-muted" style={{ fontSize: 12 }}>Target Est</div>
                <div className="fw-semibold mt-1">—</div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단: Overview + Facts */}
        <div className="row g-4 mt-1">
          <div className="col-12 col-lg-8">
            <div className="fs-card">
              <div className="fs-card-head">
                <div className="fs-card-title">{stock?.name || symbol} Overview</div>
              </div>
              <div className="fs-card-body">
                <p className="text-muted" style={{ lineHeight: 1.7 }}>
                  회사 설명 데이터가 아직 제공되지 않았습니다. 추후 회사 개요/제품/서비스/세그먼트 정보를 연결해 표시합니다.
                </p>
                <button className="fs-btn fs-btn-ghost">More about {stock?.name || symbol}</button>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="fs-card">
              <div className="fs-card-body">
                <div className="d-grid" style={{ gap: 16 }}>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Full Time Employees</span>
                    <span className="fw-semibold">—</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Fiscal Year Ends</span>
                    <span className="fw-semibold">—</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Sector</span>
                    <span className="fw-semibold">—</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Industry</span>
                    <span className="fw-semibold">—</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StockDetail;
