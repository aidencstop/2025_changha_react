// frontend/src/pages/MyLeague.jsx
import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import './MyLeague.css';

export default function MyLeague() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState(''); // 'start' | 'end' | 'leave' | ''
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/leagues/my/');
      setData(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isManager = !!data?.is_manager;
  const league = data?.league;

  const confirm = (msg) => window.confirm(msg);

  const runAction = async (kind, fn) => {
    if (!league?.id) return;
    setAction(kind);
    try {
      await fn();
      alert(
        kind === 'start'
          ? '리그를 시작했습니다.'
          : kind === 'end'
          ? '리그를 종료했습니다.'
          : '리그를 떠났습니다.'
      );
      await load();
    } catch (e) {
      alert(e?.response?.data?.detail || '요청에 실패했습니다.');
    } finally {
      setAction('');
    }
  };

  const handleStart = () => {
    if (!confirm('지금 바로 리그를 시작할까요? 모든 멤버에게 초기 현금이 지급되고 거래가 시작됩니다.')) return;
    runAction('start', () => api.post(`/leagues/${league.id}/start/`));
  };

  const handleEnd = () => {
    if (!confirm('지금 리그를 종료할까요? 최종 결과가 기록됩니다.')) return;
    runAction('end', () => api.post(`/leagues/${league.id}/end/`));
  };

  const handleLeave = () => {
    if (!data?.in_league) return;
    if (!confirm('이 리그에서 나가시겠습니까?')) return;
    runAction('leave', () => api.post(`/leagues/${league.id}/leave/`));
  };

  const statusClass = useMemo(() => {
    const s = league?.status;
    if (s === 'ACTIVE') return 'badge bg-success';
    if (s === 'DRAFT')  return 'badge bg-secondary';
    if (s === 'ENDED')  return 'badge bg-dark';
    return 'badge bg-light text-dark';
  }, [league?.status]);

  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    if (!q.trim()) return data.members;
    const qq = q.trim().toLowerCase();
    return data.members.filter(m =>
      (m.username || '').toLowerCase().includes(qq)
    );
  }, [data, q]);

  const formatDate = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}.`;
  };

  return (
    <main className="fs-page fs-page--fluid fs-myleague">
      {/* Page Header — History.jsx와 간격 맞춤 */}
      <div className="fs-page-header fs-ml-tighthead">
        <div>
          <h1 className="fs-title">My League</h1>
          <p className="fs-sub">
            {league?.name ? league.name : 'Manage and participate in your league'}
            {league?.status && (
              <>
                {' · '}
                <span className={`fs-status ${statusClass}`}>
                  {league.status}
                </span>
              </>
            )}
          </p>
          {error && <span className="badge bg-danger mt-2">{error}</span>}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <section className="fs-card mt-1">
          <div className="fs-card-body">
            <div className="fs-skel-row" />
            <div className="fs-skel-row" />
            <div className="fs-skel-row" />
          </div>
        </section>
      )}

      {!loading && data && !data.in_league && (
        <section className="fs-card">
          <div className="fs-card-body">
            <h4 className="fs-card-title">My League</h4>
            <div className="alert alert-info mb-0">
              현재 참여 중인 리그가 없습니다. <strong>Leagues</strong> 화면으로 이동해 리그를 생성하거나 참여해 주세요.
            </div>
          </div>
        </section>
      )}

      {/* Main content — 그리드 커스텀 (좌:약55% / 우:약45%), 세로 꽉 채움 */}
      {!loading && data?.in_league && league && (
        <div className="fs-ml-main">
          {/* Left: Members */}
          <section className="fs-card fs-ml-left">
            <div className="fs-card-body h-100 d-flex flex-column">
              <div className="fs-card-head">
                <h5 className="fs-card-title m-0">Members</h5>
                <input
                  className="form-control fs-ml-search"
                  placeholder="멤버 검색 (username)"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="table-responsive fs-ml-table-wrap" style={{ flex: 1, minHeight: 0 }}>
                <table
                  className="table table-sm align-middle mb-0 fs-ml-table"
                  style={{ tableLayout: 'fixed', width: '100%' }}
                >
                  {/* 👇 1:3:3:3 비율 적용 */}
                  <colgroup>
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '30%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User</th>
                      <th className="text-end">Balance</th>
                      <th className="text-end">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          검색 결과가 없습니다.
                        </td>
                      </tr>
                    )}
                    {filteredMembers.map((m, i) => (
                      <tr key={m.id ?? `${m.username}-${i}`}>
                        <td className="text-muted">{i + 1}</td>
                        <td className="fw-semibold">{m.username}</td>
                        <td className="text-end">
                          {Number(m.cash_balance || 0).toLocaleString()}
                        </td>
                        <td className="text-end text-muted">
                          {formatDate(m.joined_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Right: League summary + actions */}
          <div className="fs-ml-right">
            <section className="fs-card h-100">
              <div className="fs-card-body d-flex flex-column">
                <div className="fs-ml-kpis">
                  <div className="fs-ml-kpi">
                    <div className="fs-ml-kpi__label">Initial Cash</div>
                    <div className="fs-ml-kpi__value">
                      {Number(league.initial_cash ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="fs-ml-kpi">
                    <div className="fs-ml-kpi__label">Capacity</div>
                    <div className="fs-ml-kpi__value">
                      {league.current_members}/{league.max_members}
                    </div>
                  </div>
                  <div className="fs-ml-kpi">
                    <div className="fs-ml-kpi__label">Status</div>
                    <div className="fs-ml-kpi__value">
                      <span className={statusClass}>{league.status}</span>
                    </div>
                  </div>
                </div>

                {isManager && (
                  <div className="alert alert-secondary mt-3 mb-0 small">
                    <div className="fw-semibold mb-1">Manager Tips</div>
                    <ul className="mb-0 ps-3">
                      <li>New members can join the league only when it is in <span className="fw-semibold">DRAFT</span> status.</li>
                      <li>The league can start only in <span className="fw-semibold">DRAFT</span> status.</li>
                      <li>The league can end only in <span className="fw-semibold">ACTIVE</span> status.</li>
                      <li>When the league ends, all states are saved (trade history, balance, and portfolio).</li>
                    </ul>
                  </div>
                )}

                <div style={{ flex: 1 }} />

                <section className="fs-card mt-3 mb-0">
                  <div className="fs-card-body d-grid gap-2">
                    {isManager && league.status === 'DRAFT' && (
                      <button
                        className="btn btn-primary"
                        disabled={action === 'start' || loading}
                        onClick={handleStart}
                      >
                        {action === 'start' ? '시작 중…' : 'Start League'}
                      </button>
                    )}
                    {isManager && league.status === 'ACTIVE' && (
                      <button
                        className="btn btn-danger"
                        disabled={action === 'end' || loading}
                        onClick={handleEnd}
                      >
                        {action === 'end' ? '종료 중…' : 'End League'}
                      </button>
                    )}
                    {!isManager && league.status !== 'ENDED' && (
                      <button
                        className="btn btn-outline-secondary"
                        disabled={action === 'leave' || loading}
                        onClick={handleLeave}
                      >
                        {action === 'leave' ? 'Leaving…' : 'Leave League'}
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
