// frontend/src/pages/History.jsx
import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import './History.css';

function History() {
  const [leagues, setLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [error, setError] = useState('');

  // leagueId -> { items: [], page, hasMore, loading, open, idSet:Set<number> }
  const [txByLeague, setTxByLeague] = useState({});
  const loaders = useRef({});
  const observers = useRef({});

  // 🔹 헤더 우측용 상태 (Profile과 동일 컨셉)
  const [userInitials, setUserInitials] = useState('DU');
  const [leagueCash, setLeagueCash] = useState(null);
  const [loadingCash, setLoadingCash] = useState(true);

  useEffect(() => {
    fetchMyLeagues();
    // 프로필 & 리그 캐시도 함께 로드
    (async () => {
      try {
        // 프로필 이니셜
        const prof = await api.get('/accounts/profile/');
        const fn = prof?.data?.first_name || 'D';
        const ln = prof?.data?.last_name || 'U';
        const ini = `${(fn[0] ?? 'D')}${(ln[0] ?? 'U')}`.toUpperCase();
        setUserInitials(ini);
      } catch (e) {
        // 무시하고 기본 이니셜 유지
      }
      try {
        // 현재 리그 보유 현금
        const res = await api.get('/stocks/my-portfolio/');
        setLeagueCash(res?.data?.cash ?? 0);
      } catch (e) {
        if (e?.response?.status === 404) {
          setLeagueCash(null); // 아직 리그 미참여
        } else {
          // 콘솔만
          console.error('[History] cash fetch error:', e);
        }
      } finally {
        setLoadingCash(false);
      }
    })();

    return () => {
      Object.values(observers.current).forEach((obs) => obs.disconnect());
      observers.current = {};
    };
  }, []);

  const fetchMyLeagues = async () => {
    try {
      setLoadingLeagues(true);
      setError('');
      const res = await api.get('/leagues/?mine=1');
      setLeagues(res.data || []);
    } catch (e) {
      console.error(e);
      setError('리그 목록을 불러오지 못했습니다.');
    } finally {
      setLoadingLeagues(false);
    }
  };

  const toggleDetails = (leagueId) => {
    setTxByLeague((prev) => {
      const cur = prev[leagueId];
      if (cur?.open) {
        if (observers.current[leagueId]) {
          observers.current[leagueId].disconnect();
          delete observers.current[leagueId];
        }
        return { ...prev, [leagueId]: { ...cur, open: false } };
      }
      const base =
        cur ?? { items: [], page: 1, hasMore: true, loading: false, open: false, idSet: new Set() };
      return { ...prev, [leagueId]: { ...base, open: true } };
    });

    const state = txByLeague[leagueId];
    if (!state || (state.items?.length ?? 0) === 0) {
      fetchMoreTx(leagueId);
    }
  };

  const fetchMoreTx = async (leagueId) => {
    let nextPage = 1;
    let canFetch = true;

    setTxByLeague((prev) => {
      const cur =
        prev[leagueId] ?? { items: [], page: 1, hasMore: true, loading: false, open: true, idSet: new Set() };
      if (cur.loading || !cur.hasMore) {
        canFetch = false;
        return prev;
      }
      nextPage = cur.page || 1;
      return { ...prev, [leagueId]: { ...cur, loading: true } };
    });

    if (!canFetch) return;

    try {
      const res = await api.get(`/stocks/trade-history/?page=${nextPage}&league_id=${leagueId}`);
      const results = res?.data?.results ?? res?.data ?? [];
      const hasNext = Boolean(res?.data?.next);

      setTxByLeague((prev) => {
        const cur =
          prev[leagueId] ?? { items: [], page: 1, hasMore: true, loading: true, open: true, idSet: new Set() };
        const idSet = new Set(cur.idSet);
        const newOnes = [];
        for (const tx of results) {
          const id = tx?.id;
          if (id != null && !idSet.has(id)) {
            idSet.add(id);
            newOnes.push(tx);
          }
        }
        return {
          ...prev,
          [leagueId]: {
            ...cur,
            items: [...cur.items, ...newOnes],
            idSet,
            page: hasNext ? cur.page + 1 : cur.page,
            hasMore: hasNext,
            loading: false,
          },
        };
      });
    } catch (e) {
      console.error('fetchMoreTx error', e);
      setTxByLeague((prev) => {
        const cur =
          prev[leagueId] ?? { items: [], page: 1, hasMore: true, loading: true, open: true, idSet: new Set() };
        return { ...prev, [leagueId]: { ...cur, loading: false } };
      });
    }
  };

  useEffect(() => {
    leagues.forEach((lg) => {
      const leagueId = lg.id;
      const state = txByLeague[leagueId];
      const loaderEl = loaders.current[leagueId];

      if (observers.current[leagueId]) {
        observers.current[leagueId].disconnect();
        delete observers.current[leagueId];
      }

      if (!state?.open || !loaderEl || state.loading || !state.hasMore) return;

      const observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (!entry.isIntersecting) return;
          const s = txByLeague[leagueId];
          if (!s || s.loading || !s.hasMore) return;
          fetchMoreTx(leagueId);
        },
        { root: null, rootMargin: '200px', threshold: 0 }
      );

      observer.observe(loaderEl);
      observers.current[leagueId] = observer;
    });
  }, [leagues, txByLeague]);

  const formatMoney = (v) => {
    const num = Number(v);
    if (Number.isNaN(num)) return v ?? '-';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pct = (v) => {
    const num = Number(v);
    if (Number.isNaN(num)) return '-';
    return `${num.toFixed(2)}%`;
  };

  // yyyy.mm.dd.
  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d)) return value;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}.`;
  };

  const money0 = (n = 0) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="fs-layout">
      {/* 전역 스코프용 id 추가 → History.css에서 안전하게 스타일링 */}
      <main
        id="fs-history"
        className="fs-page fs-page--fluid"
        style={{
          width: '100%',
          maxWidth: '100%',
          paddingLeft: 'min(16px, 2vw)',
          paddingRight: 'min(16px, 2vw)',
        }}
      >
        {/* ── 헤더: 좌(타이틀/서브) | 우(잔액/미니아바타) */}
        <div className="fs-history__headerwrap">
          <div className="fs-history__header-left">
            <h2 className="fs-title">My League History</h2>
            <p className="fs-sub">Your historical trades by league</p>
          </div>

          <div className="fs-history__header-right">
            <div className="fs-history__balanceblock">
              <div className="fs-history__balance-label">Available Balance</div>
              <div className="fs-history__balance-amount">
                {loadingCash
                  ? 'Loading...'
                  : leagueCash === null
                  ? 'Not in a league yet'
                  : `$${money0(leagueCash)}`}
              </div>
            </div>
            <div className="fs-history__avatar-mini">{userInitials}</div>
          </div>
        </div>

        {/* 상태 카드들 */}
        <section
          className="fs-band"
          style={{
            width: '100%',
            margin: 0,
            padding: 0,
          }}
        >
          {error && (
            <div className="fs-card" style={{ borderColor: 'transparent' }}>
              <div className="fs-card-head">
                <div className="fs-card-title">Error</div>
              </div>
              <div className="fs-empty" style={{ color: 'var(--danger, #dc3545)' }}>{error}</div>
            </div>
          )}
          {loadingLeagues && (
            <div className="fs-card" style={{ borderColor: 'transparent' }}>
              <div className="fs-empty">⏳ Loading league list…</div>
            </div>
          )}
          {!loadingLeagues && leagues.length === 0 && (
            <div className="fs-card" style={{ borderColor: 'transparent' }}>
              <div className="fs-empty">There are no leagues participated in.</div>
            </div>
          )}

          {/* 카드 리스트 */}
          <div
            className="fs-stack"
            style={{
              display: 'grid',
              gap: '16px',
              alignContent: 'start',
            }}
          >
            {leagues.map((lg) => {
              const mine = txByLeague[lg.id];
              return (
                <div key={lg.id} className="fs-card" style={{ width: '100%' }}>
                  <div className="fs-card-head">
                    <div className="fs-card-title">{lg.name}</div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span
                        className="fs-sub"
                        style={{
                          margin: 0,
                          color: lg.status === 'Active' ? 'var(--success, #28a745)' : 'inherit',
                          fontWeight: lg.status === 'Active' ? 600 : 'normal',
                        }}
                      >
                        {lg.status}
                      </span>
                      <span className="fs-sub" style={{ margin: 0 }}>
                        ({formatDate(lg.start_date)} → {lg.end_date ? formatDate(lg.end_date) : '—'})
                      </span>
                    </div>
                  </div>

                  <div className="fs-card-body">
                    <div className="row mt-1 g-3">
                      <div className="col-6 col-md-3">
                        <div className="fs-sub">Initial</div>
                        <div className="fw-bold">${formatMoney(lg.my_initial_asset)}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="fs-sub">Final</div>
                        <div className="fw-bold">${formatMoney(lg.my_final_asset)}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="fs-sub">Return</div>
                        <div className="fw-bold">{pct(lg.my_return_pct)}</div>
                      </div>
                      <div className="col-6 col-md-3">
                        <div className="fs-sub">Participants</div>
                        <div className="fw-bold">{lg.participant_count}</div>
                      </div>
                    </div>

                    <div className="row mt-2 g-3">
                      <div className="col-6 col-md-3">
                        <div className="fs-sub">My Rank</div>
                        <div className="fw-bold">{lg.my_final_rank ?? '—'}</div>
                      </div>
                    </div>

                    <div className="mt-3" style={{ display: 'flex', gap: '8px' }}>
                      <button className="fs-btn fs-btn-primary" onClick={() => toggleDetails(lg.id)}>
                        {mine?.open ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>

                    {mine?.open && (
                      <div className="mt-3">
                        <div className="table-responsive">
                          <table className="fs-table">
                            <thead>
                              <tr>
                                <th style={{ width: 56 }}>#</th>
                                <th>Symbol</th>
                                <th>Action</th>
                                <th>Quantity</th>
                                <th>Price</th>
                                <th>Time</th>
                              </tr>
                            </thead>
                            <tbody>
                              {mine.items.length === 0 && !mine.loading && !mine.hasMore ? (
                                <tr>
                                  <td colSpan={6} className="fs-empty">
                                    There is no transaction history.
                                  </td>
                                </tr>
                              ) : (
                                mine.items.map((it, idx) => {
                                  const sym = it.stock ?? it.symbol ?? it.stock_symbol ?? '-';
                                  const qty = it.quantity ?? it.shares ?? it.qty ?? '-';
                                  const action = (it.action ?? it.side ?? '').toString().toUpperCase();
                                  const when = it.timestamp ?? it.created_at ?? it.date ?? '';
                                  const key =
                                    it.id ?? `${lg.id}-${sym}-${when}-${qty}-${it.price}-${action}-${idx}`;
                                  const isBuy = action === 'BUY';
                                  return (
                                    <tr key={key} className="fs-row">
                                      <td>{idx + 1}</td>
                                      <td className="fs-mono">{sym}</td>
                                      <td style={{ fontWeight: 600 }}>{isBuy ? 'BUY' : action || '—'}</td>
                                      <td>{qty}</td>
                                      <td>${formatMoney(it.price)}</td>
                                      <td>{formatDate(when)}</td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        <div ref={(el) => (loaders.current[lg.id] = el)} className="text-center py-2">
                          {mine.loading && <p className="mb-0">Loading…</p>}
                          {!mine.loading && mine.hasMore && <p className="fs-sub mb-0">Scroll down to load more</p>}
                          {!mine.hasMore && mine.items.length > 0 && (
                            <p className="fs-sub mb-0">All transaction history has been retrieved.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default History;
