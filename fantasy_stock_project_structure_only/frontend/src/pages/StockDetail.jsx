// frontend/src/pages/StockDetail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useParams, useNavigate } from 'react-router-dom';

function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [side, setSide] = useState('buy');

  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileSrc, setProfileSrc] = useState(null);
  const [companyMeta, setCompanyMeta] = useState({
    sector: null,
    industry: null,
    fullTimeEmployees: null,
    fiscalYearEnd: null,
  });

  useEffect(() => {
    const fetchStockDetail = async () => {
      try {
        const res = await api.get(`/stocks/detail/${symbol}/`);
        setStock(res.data);
      } catch {
        setMessage('Failed to load stock data');
      }
    };
    fetchStockDetail();
  }, [symbol]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get(`/stocks/company-profile/${symbol}/`);
        setProfile(data?.profile || null);
        setProfileSrc(data?.source || null);
        setCompanyMeta({
          sector: data?.sector ?? null,
          industry: data?.industry ?? null,
          fullTimeEmployees: data?.fullTimeEmployees ?? null,
          fiscalYearEnd: data?.fiscalYearEnd ?? null,
        });
      } catch {
        setProfile(null);
      }
    };
    const loadStats = async () => {
      try {
        const { data } = await api.get(`/stocks/key-stats/${symbol}/`);
        setStats(data || null);
      } catch {
        setStats(null);
      }
    };
    loadProfile();
    loadStats();
  }, [symbol]);

  const close = Number(stock?.close ?? 0);
  const volume = Number(stock?.volume ?? 0);

  const qtyNum = Number.isFinite(parseInt(quantity, 10)) ? parseInt(quantity, 10) : 0;
  const total = useMemo(() => (qtyNum > 0 ? qtyNum * close : 0), [qtyNum, close]);

  // 잔액 불러오는 함수
  const loadCash = async () => {
    try {
      const res = await api.get('/stocks/my-portfolio/');
      setLeagueCash(res.data.cash ?? 0);
    } catch {
      setLeagueCash(null);
    } finally {
      setLoadingCash(false);
    }
  };

  // 잔액을 처음 로드할 때와 매수/매도 후 갱신
  useEffect(() => {
    loadCash();  // 컴포넌트가 마운트될 때 초기 잔액 로드
  }, []);

  const handleAction = async (action) => {
    setMessage('');
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setMessage('Please enter a quantity greater than 1.');
      return;
    }
    try {
      const endpoint = action === 'buy' ? '/stocks/buy/' : '/stocks/sell/';
      const res = await api.post(endpoint, { symbol, shares: qty });
      setMessage(
        res.data.status ||
          res.data.message ||
          (action === 'buy' ? 'Purchase completed' : 'Sale completed')
      );
      setQuantity('');

      // 매수/매도 후 잔액 갱신
      loadCash();  // 잔액 갱신
    } catch (err) {
      const errMsg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        'Trade failed.';
      setMessage(errMsg);
    }
  };



  const fmtMoney = (v) =>
    isFinite(v)
      ? `$${Number(v).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : '—';
  const fmtInt = (v) => (isFinite(v) ? Number(v).toLocaleString() : '—');

  // stats 안전 접근
  const s = stats || {};
  const previousClose = s.previousClose ? Number(s.previousClose) : null;
  const marketCap = s.marketCap ? `$${Number(s.marketCap).toLocaleString()}` : '—';
  const avgVolume = s.avgVolume ? Number(s.avgVolume).toLocaleString() : '—';
  const bid = s.bid ? Number(s.bid).toLocaleString() : '—';
  const ask = s.ask ? Number(s.ask).toLocaleString() : '—';
  const targetEst = s.targetEst ? Number(s.targetEst).toLocaleString() : '—';
  const peRatioTTM = s.peRatioTTM ? s.peRatioTTM.toFixed(2) : '—';
  const epsTTM =
    s.epsTTM || s.epsTTM === 0 ? String(s.epsTTM) : '—';
  const dividendRate =
    s.dividendRate || s.dividendRate === 0 ? String(s.dividendRate) : '—';
  const exDividendDate = s.exDividendDate ? String(s.exDividendDate) : '—';
  const open = s.open ? String(s.open) : '—';

  const metaEmployees =
    companyMeta.fullTimeEmployees != null
      ? Number(companyMeta.fullTimeEmployees).toLocaleString()
      : '—';
  const metaSector = companyMeta.sector || '—';
  const metaIndustry = companyMeta.industry || '—';

  // 변동값 계산
  const safeNum = (v) =>
    v === null || v === undefined || v === '' || Number.isNaN(Number(v))
      ? null
      : Number(v);
  const prevCloseNum = safeNum(previousClose);
  const closeNum = safeNum(close);

  let delta = null;
  let deltaPct = null;
  if (prevCloseNum !== null && prevCloseNum > 0 && closeNum !== null) {
    delta = closeNum - prevCloseNum;
    deltaPct = (delta / prevCloseNum) * 100;
  }

  const isPos = delta !== null && delta > 0;
  const isNeg = delta !== null && delta < 0;

  const badgeBg = isPos
    ? 'rgba(34,197,94,0.15)'
    : isNeg
    ? 'rgba(239,68,68,0.15)'
    : 'rgba(128,128,128,0.15)';
  const badgeColor = isPos ? '#16a34a' : isNeg ? '#dc2626' : '#6b7280';

  const badgeText =
    delta === null
      ? '—'
      : `${delta >= 0 ? '+' : ''}${fmtMoney(delta)} (${
          deltaPct >= 0 ? '+' : ''
        }${deltaPct.toFixed(2)}%)`;

  // 작은 Key-Value 행 렌더러
  const kv = (label, value) => (
    <div
      className="d-flex justify-content-between align-items-baseline"
      style={{ padding: '8px 0' }}
    >
      <div className="text-muted" style={{ fontSize: 14 }}>
        {label}
      </div>
      <div className="fw-semibold" style={{ fontSize: 18 }}>
        {value}
      </div>
    </div>
  );

  const colDivider = { borderRight: '1px solid rgba(128,128,128,0.25)' };

  const VALUE_BOX_STYLE = {
    flex: '0 0 156px',
    width: 156,
    maxWidth: 156,
    minWidth: 0,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };
  const LABEL_STYLE = { minWidth: 60, marginRight: 8 };








  const [userInitials, setUserInitials] = useState('DU');  // For avatar initials
  const [leagueCash, setLeagueCash] = useState(null);      // League Cash (Balance)
  const [loadingCash, setLoadingCash] = useState(true);

  useEffect(() => {
    const fetchStockDetail = async () => {
      try {
        const res = await api.get(`/stocks/detail/${symbol}/`);
        setStock(res.data);
      } catch {
        setMessage('Failed to load stock data');
      }
    };
    fetchStockDetail();
  }, [symbol]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await api.get(`/stocks/company-profile/${symbol}/`);
        setProfile(data?.profile || null);
        setProfileSrc(data?.source || null);
        setCompanyMeta({
          sector: data?.sector ?? null,
          industry: data?.industry ?? null,
          fullTimeEmployees: data?.fullTimeEmployees ?? null,
          fiscalYearEnd: data?.fiscalYearEnd ?? null,
        });
      } catch {
        setProfile(null);
      }
    };
    loadProfile();
  }, [symbol]);



  const money = (n = 0) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  useEffect(() => {
    // 유저 정보 불러와서 이니셜 업데이트
    const fetchUserInfo = async () => {
      try {
        const res = await api.get('/accounts/profile/');
        const firstName = res.data.first_name || 'D';
        const lastName = res.data.last_name || 'U';
        setUserInitials(`${firstName[0]}${lastName[0]}`.toUpperCase());  // 첫 글자만 따서 이니셜 만들기
      } catch {
        setUserInitials('DU');  // 실패할 경우 기본 이니셜
      }
    };
    fetchUserInfo();
  }, []);

    return (
    <div className="fs-layout">
      <main className="fs-page fs-page--fluid">
        <div className="fs-page-header d-flex align-items-center">
          <button
            className="fs-btn fs-btn-ghost"
            onClick={() => navigate(-1)}
            style={{ borderRadius: 999 }}
          >
            ← Back to Market
          </button>

          {/* Header Right Section */}
          <div className="fs-profile__header-right">
            <div className="fs-profile__balanceblock">
              <div className="fs-profile__balance-label">Available Balance</div>
              <div className="fs-profile__balance-amount">
                {loadingCash
                  ? 'Loading...'
                  : leagueCash === null
                  ? 'Not in a league yet'
                  : `$${money(leagueCash)}`}
              </div>
            </div>
            <div className="fs-profile__avatar-mini">{userInitials}</div>
          </div>
        </div>

        <hr
          style={{
            border: 'none',
            borderTop: '1px solid rgba(128,128,128,0.25)',
            margin: '8px 0 16px',
            width: '100%',
          }}
        />

        {/* 상단 카드 */}
        <div className="row g-4 align-items-stretch">
          <div className="col-12 col-lg-8 d-flex">
            <div className="fs-card h-100 w-100">
              <div className="fs-card-body d-flex flex-column justify-content-between">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <div className="d-flex align-items-center gap-3">
                      <h1
                        className="m-0"
                        style={{ fontWeight: 800, letterSpacing: -0.3 }}
                      >
                        {stock?.name || symbol}
                      </h1>
                      <div className="text-muted">
                        <div style={{ lineHeight: 1.2, marginTop: 4 }}>
                          <span className="fw-semibold">{symbol}</span>
                          <div style={{ fontSize: 12, opacity: 0.8 }}>
                            {stock?.name}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 d-flex align-items-center gap-3">
                      <div
                        style={{ fontSize: 32, fontWeight: 800 }}
                      >
                        {fmtMoney(close)}
                      </div>
                      <span
                        className="badge"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          background: badgeBg,
                          color: badgeColor,
                          padding: '8px 10px',
                          borderRadius: 12,
                          fontWeight: 700,
                        }}
                      >
                        {badgeText}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid rgba(128,128,128,0.25)',
                  margin: '16px 0',
                  width: '100%',
                }}
              />

              <div
                className="d-flex align-items-center justify-content-between text-center"
                style={{ width: '100%', minHeight: 48 }}
              >
                <div
                  className="d-flex align-items-center justify-content-center flex-grow-1"
                  style={{
                    gap: 6,
                    borderRight: '1px solid rgba(128,128,128,0.25)',
                    padding: '0 8px',
                  }}
                >
                  <span
                    className="text-muted"
                    style={{ fontSize: 12 }}
                  >
                    Employees
                  </span>
                  <span className="fw-semibold">
                    {metaEmployees}
                  </span>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center flex-grow-1"
                  style={{
                    gap: 6,
                    borderRight: '1px solid rgba(128,128,128,0.25)',
                    padding: '0 8px',
                  }}
                >
                  <span
                    className="text-muted"
                    style={{ fontSize: 12 }}
                  >
                    Sector
                  </span>
                  <span className="fw-semibold">
                    {metaSector}
                  </span>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center flex-grow-1"
                  style={{ gap: 6, padding: '0 8px' }}
                >
                  <span
                    className="text-muted"
                    style={{ fontSize: 12 }}
                  >
                    Industry
                  </span>
                  <span className="fw-semibold">
                    {metaIndustry}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 주문 카드 */}
          <div className="col-12 col-lg-4 d-flex">
            <div className="fs-card h-100 w-100">
              <div className="fs-card-head d-flex justify-content-between align-items-center">
                <div className="fs-card-title">Order</div>
                <div
                  className="d-inline-flex"
                  style={{
                    background: 'rgba(113, 113, 122, .12)',
                    borderRadius: 999,
                    padding: 4,
                    gap: 4,
                  }}
                >
                  <button
                    className={`fs-btn ${
                      side === 'buy'
                        ? 'fs-btn-primary'
                        : 'fs-btn-ghost'
                    }`}
                    onClick={() => setSide('buy')}
                    style={{ borderRadius: 999, minWidth: 72 }}
                  >
                    Buy
                  </button>
                  <button
                    className={`fs-btn ${
                      side === 'sell'
                        ? 'fs-btn-primary'
                        : 'fs-btn-ghost'
                    }`}
                    onClick={() => setSide('sell')}
                    style={{ borderRadius: 999, minWidth: 72 }}
                  >
                    Sell
                  </button>
                </div>
              </div>

              <div className="fs-card-body d-flex flex-column">
                {/* Shares */}
                <div className="mb-3 d-flex align-items-center justify-content-between">
                  <div className="text-muted" style={LABEL_STYLE}>
                    Shares
                  </div>
                  <div style={VALUE_BOX_STYLE}>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      className="fs-search-input"
                      placeholder="Enter quantity"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(e.target.value)
                      }
                      style={{
                        width: '100%',
                        backgroundColor: '#f8f9fa',
                        boxSizing: 'border-box',
                        padding: '8px 12px',
                        minWidth: 0,
                        caretColor: '#000', // 커서 보이게
                        color: '#000', // 입력 텍스트 명확하게
                      }}
                    />
                  </div>
                </div>

                {/* Price */}
                <div
                  className="mb-3 d-flex align-items-center"
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="text-muted me-2"
                    style={{ minWidth: 60 }}
                  >
                    Price
                  </div>
                  <div
                    className="ms-auto d-flex align-items-center justify-content-end"
                    style={VALUE_BOX_STYLE}
                  >
                    <div
                      className="fs-search-input text-end"
                      style={{
                        pointerEvents: 'none',
                        color: '#000',
                        opacity: 1,
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {fmtMoney(close)}
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div
                  className="mb-4 d-flex align-items-center"
                  style={{ overflow: 'hidden' }}
                >
                  <div
                    className="text-muted me-2"
                    style={{ minWidth: 60 }}
                  >
                    Total
                  </div>
                  <div
                    className="ms-auto d-flex align-items-center justify-content-end"
                    style={VALUE_BOX_STYLE}
                  >
                    <div
                      className="fw-bold text-end"
                      style={{
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      {fmtMoney(total)}
                    </div>
                  </div>
                </div>

                <button
                  className="fs-btn fs-btn-primary w-100 mt-auto"
                  onClick={() => handleAction(side)}
                >
                  Order
                </button>
                {message && (
                  <div className="alert alert-info mt-3 mb-0">
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detail Stock */}
        <div className="fs-card mt-4">
          <div className="fs-card-head">
            <div>
              <div className="fs-card-title">Detail Stock</div>
              <div
                className="text-muted"
                style={{ fontSize: 12 }}
              >
                Comprehensive details on individual stocks
              </div>
            </div>
          </div>

          <div className="fs-card-body">
            <div className="row g-0">
              <div
                className="col-12 col-md-4 px-3 px-md-4"
                style={colDivider}
              >
                {kv(
                  'Previous Close',
                  previousClose
                    ? fmtMoney(previousClose)
                    : '—'
                )}
                {kv('Open', open)}
                {kv('Bid', `${bid}`)}
                {kv('Ask', `${ask}`)}
              </div>
              <div
                className="col-12 col-md-4 px-3 px-md-4"
                style={colDivider}
              >
                {kv('Volume', fmtInt(volume))}
                {kv('Avg. Volume', avgVolume)}
                {kv('Market Cap', marketCap)}
                {kv('PE Ratio (TTM)', peRatioTTM)}
              </div>
              <div className="col-12 col-md-4 px-3 px-md-4">
                {kv('EPS (TTM)', epsTTM)}
                {kv('Forward Dividend', dividendRate)}
                {kv('Ex-Dividend Date', exDividendDate)}
                {kv('Target Est', targetEst)}
              </div>
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="row g-4 mt-1">
          <div className="col-12">
            <div className="fs-card">
              <div className="fs-card-head">
                <div className="fs-card-title">
                  {stock?.name || symbol} Overview
                </div>
              </div>
              <div className="fs-card-body">
                {profile ? (
                  <>
                    <p
                      className="text-muted"
                      style={{
                        whiteSpace: 'pre-line',
                        lineHeight: 1.7,
                      }}
                    >
                      {profile}
                    </p>
                    {profileSrc && (
                      <a
                        className="fs-btn fs-btn-ghost"
                        href={profileSrc}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View source (Yahoo Finance)
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-muted">
                    Company description data is not yet
                    ready.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StockDetail;
