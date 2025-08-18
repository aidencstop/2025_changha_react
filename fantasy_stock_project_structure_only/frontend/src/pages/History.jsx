// frontend/src/pages/History.jsx
import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

function History() {
  const [leagues, setLeagues] = useState([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  const [error, setError] = useState('');

  // leagueId -> { items: [], page, hasMore, loading, open, idSet:Set<number> }
  const [txByLeague, setTxByLeague] = useState({});
  const loaders = useRef({});    // leagueId별 loader 요소 refs
  const observers = useRef({});  // leagueId별 IntersectionObserver

  useEffect(() => {
    fetchMyLeagues();
    // 언마운트 시 모든 옵저버 정리
    return () => {
      Object.values(observers.current).forEach(obs => obs.disconnect());
      observers.current = {};
    };
  }, []);

  const fetchMyLeagues = async () => {
    try {
      setLoadingLeagues(true);
      setError('');
      // 백엔드: /api/leagues/?mine=1  (axios baseURL=/api 이므로 /leagues/)
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
    setTxByLeague(prev => {
      const cur = prev[leagueId];
      // 닫기
      if (cur?.open) {
        // 옵저버 해제
        if (observers.current[leagueId]) {
          observers.current[leagueId].disconnect();
          delete observers.current[leagueId];
        }
        return { ...prev, [leagueId]: { ...cur, open: false } };
      }
      // 열기 (초기 상태 준비)
      const base = cur ?? { items: [], page: 1, hasMore: true, loading: false, open: false, idSet: new Set() };
      return { ...prev, [leagueId]: { ...base, open: true } };
    });

    // 처음 열면서 비어있으면 첫 페이지 로드
    const state = txByLeague[leagueId];
    if (!state || (state.items?.length ?? 0) === 0) {
      fetchMoreTx(leagueId);
    }
  };

  // league 트랜잭션 페치 (중복/재진입 방지)
  const fetchMoreTx = async (leagueId) => {
    let nextPage = 1;
    let canFetch = true;

    setTxByLeague(prev => {
      const cur = prev[leagueId] ?? { items: [], page: 1, hasMore: true, loading: false, open: true, idSet: new Set() };
      // 가드: 로딩 중이거나 더 없음
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

      setTxByLeague(prev => {
        const cur = prev[leagueId] ?? { items: [], page: 1, hasMore: true, loading: true, open: true, idSet: new Set() };
        // idSet 복사하여 중복 방지
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
            page: hasNext ? (cur.page + 1) : cur.page,
            hasMore: hasNext,
            loading: false,
          }
        };
      });
    } catch (e) {
      console.error('fetchMoreTx error', e);
      setTxByLeague(prev => {
        const cur = prev[leagueId] ?? { items: [], page: 1, hasMore: true, loading: true, open: true, idSet: new Set() };
        return { ...prev, [leagueId]: { ...cur, loading: false } };
      });
    }
  };

  // 옵저버 등록/재등록 (열림 + 로딩X + hasMore일 때만)
  useEffect(() => {
    leagues.forEach(lg => {
      const leagueId = lg.id;
      const state = txByLeague[leagueId];
      const loaderEl = loaders.current[leagueId];

      // 기존 옵저버 정리
      if (observers.current[leagueId]) {
        observers.current[leagueId].disconnect();
        delete observers.current[leagueId];
      }

      if (!state?.open || !loaderEl || state.loading || !state.hasMore) return;

      const observer = new IntersectionObserver(entries => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        // 현재 상태 재확인(스팸 방지)
        const s = txByLeague[leagueId];
        if (!s || s.loading || !s.hasMore) return;
        fetchMoreTx(leagueId);
      }, { root: null, rootMargin: '200px', threshold: 0 });

      observer.observe(loaderEl);
      observers.current[leagueId] = observer;
    });

    // cleanup은 다음 사이클에서 위에서 disconnect 처리
  }, [leagues, txByLeague]); // 상태 변화 시 재평가 (가드가 있으므로 안전)

  const formatMoney = v => {
    const num = Number(v);
    if (Number.isNaN(num)) return v ?? '-';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pct = v => {
    const num = Number(v);
    if (Number.isNaN(num)) return '-';
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="container mt-5">
      <h2>My League History</h2>

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {loadingLeagues && <p className="mt-3">Loading leagues…</p>}
      {!loadingLeagues && leagues.length === 0 && <div className="alert alert-secondary mt-3">참여한 리그가 없습니다.</div>}

      <div className="mt-3 d-grid gap-3">
        {leagues.map(lg => {
          const mine = txByLeague[lg.id];
          return (
            <div key={lg.id} className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-center gap-3">
                  <h5 className="mb-0">{lg.name}</h5>
                  <span className="badge text-bg-secondary">{lg.status}</span>
                  <span className="ms-auto text-muted">({lg.start_date} → {lg.end_date ?? '—'})</span>
                </div>

                <div className="row mt-3 g-3">
                  <div className="col-6 col-md-3">
                    <div className="small text-muted">Initial</div>
                    <div className="fw-bold">${formatMoney(lg.my_initial_asset)}</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="small text-muted">Final</div>
                    <div className="fw-bold">${formatMoney(lg.my_final_asset)}</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="small text-muted">Return</div>
                    <div className="fw-bold">{pct(lg.my_return_pct)}</div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="small text-muted">Participants</div>
                    <div className="fw-bold">{lg.participant_count}</div>
                  </div>
                </div>

                <div className="row mt-2 g-3">
                  <div className="col-6 col-md-3">
                    <div className="small text-muted">My Rank</div>
                    <div className="fw-bold">{lg.my_final_rank ?? '—'}</div>
                  </div>
                </div>

                <div className="mt-3 d-flex gap-2">
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => toggleDetails(lg.id)}
                  >
                    {mine?.open ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>

                {mine?.open && (
                  <div className="mt-3">
                    <ul className="list-group">
                      {mine.items.map((it, idx) => {
                        const sym = it.stock ?? it.symbol ?? it.stock_symbol ?? '-';
                        const qty = it.quantity ?? it.shares ?? it.qty ?? '-';
                        const action = (it.action ?? it.side ?? '').toString().toUpperCase();
                        const when = it.timestamp ?? it.created_at ?? it.date ?? '';
                        const key = it.id ?? `${lg.id}-${sym}-${when}-${qty}-${it.price}-${action}-${idx}`;
                        return (
                          <li key={key} className="list-group-item d-flex flex-wrap align-items-center gap-2">
                            <span className="badge text-bg-secondary">{idx + 1}</span>
                            <strong className="ms-2">{sym}</strong>
                            <span className={`badge ${action === 'BUY' ? 'text-bg-success' : 'text-bg-danger'} ms-2`}>{action || '—'}</span>
                            <span className="ms-2">{qty} shares @ ${formatMoney(it.price)}</span>
                            <span className="ms-auto">{when}</span>
                          </li>
                        );
                      })}
                    </ul>

                    <div
                      ref={el => (loaders.current[lg.id] = el)}
                      className="text-center py-2"
                    >
                      {mine.loading && <p className="mb-0">Loading…</p>}
                      {!mine.loading && mine.items.length === 0 && !mine.hasMore && (
                        <p className="text-muted mb-0">거래 내역이 없습니다.</p>
                      )}
                      {!mine.loading && mine.hasMore && (
                        <p className="text-muted mb-0">아래로 스크롤하면 더 불러옵니다…</p>
                      )}
                      {!mine.hasMore && mine.items.length > 0 && (
                        <p className="text-muted mb-0">모든 내역을 불러왔습니다.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default History;
