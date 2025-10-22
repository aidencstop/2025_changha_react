// frontend/src/pages/OtherUsersView.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

const OtherUsersView = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [portfolioData, setPortfolioData] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const navigate = useNavigate();

  const money = (n) => (n ?? 0).toLocaleString();
  const pct = (n) => `${(n ?? 0) > 0 ? '+' : ''}${n ?? 0}%`;

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        navigate('/login');
        return;
      }
      try {
        const response = await api.get('/stocks/season-users/', {
          headers: { Authorization: `Token ${token}` },
        });
        const list = response.data || [];
        setUsers(list);
        setLoading(false);

        // 초기 로드 시 각 유저의 요약(총자산/수익률) 보강
        enrichUsersWithTotals(list, token);
      } catch (err) {
        console.error('유저 불러오기 실패:', err);
        if (err.response?.status === 401) {
          setError('로그인 정보가 만료되었습니다.');
          navigate('/login');
        } else {
          const msg =
            err?.response?.data?.error ||
            err?.response?.data?.detail ||
            '유저 정보를 불러오지 못했습니다.';
          setError(msg);
        }
        setLoading(false);
      }
    };
    fetchUsers();
  }, [navigate]);

  // 시즌 유저 목록을 user-portfolio로 보강해서 total_asset/pnl/return_pct 채우기
  const enrichUsersWithTotals = async (list, token) => {
    try {
      const tasks = list.map((u) =>
        api
          .get(`/stocks/user-portfolio/${u.user_id}/`, {
            headers: { Authorization: `Token ${token}` },
          })
          .then((res) => ({ id: u.user_id, data: res.data }))
          .catch(() => ({ id: u.user_id, data: null }))
      );

      const results = await Promise.all(tasks);

      setUsers((curr) =>
        curr.map((u) => {
          const m = results.find((r) => r.id === u.user_id)?.data;
          if (!m) return u;
          const merged = { ...u };
          if (u.total_asset == null || u.total_asset === 0) {
            merged.total_asset = m.total_asset ?? u.total_asset;
          }
          if (u.pnl == null || u.pnl === 0) {
            merged.pnl = m.pnl ?? u.pnl;
          }
          if (u.return_pct == null || u.return_pct === 0) {
            merged.return_pct = m.return_pct ?? u.return_pct;
          }
          return merged;
        })
      );
    } catch (e) {
      console.warn('초기 총자산 보강 실패:', e);
    }
  };

  const handleViewPortfolio = async (userId) => {
    if (selectedUserId === userId) {
      setSelectedUserId(null);
      setPortfolioData(null);
      return;
    }
    setPortfolioLoading(true);
    setSelectedUserId(userId);
    try {
      const res = await api.get(`/stocks/user-portfolio/${userId}/`, {
        headers: { Authorization: `Token ${localStorage.getItem('token')}` },
      });
      setPortfolioData(res.data);

      // 패널을 연 김에 리스트의 해당 유저 요약도 최신값으로 보강
      const m = res.data || {};
      setUsers((curr) =>
        curr.map((u) =>
          u.user_id === userId
            ? {
                ...u,
                total_asset: m.total_asset ?? u.total_asset,
                pnl: m.pnl ?? u.pnl,
                return_pct: m.return_pct ?? u.return_pct,
              }
            : u
        )
      );
    } catch (err) {
      console.error('포트폴리오 불러오기 실패:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        '포트폴리오를 불러오지 못했습니다.';
      setPortfolioData(null);
      setError(msg);
    } finally {
      setPortfolioLoading(false);
    }
  };

  if (loading) return <div className="text-muted">로딩 중...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="fs-portfolio__others">
      <ul className="fs-userlist">
        {users.map((u, idx) => {
          const isOpen = selectedUserId === u.user_id;
          const gainPos = (u.return_pct ?? 0) >= 0;

          // 패널 헤더에 표시할 현금값(여러 키 대응)
          const cash =
            isOpen && portfolioData && u.user_id === selectedUserId
              ? portfolioData.cash ??
                portfolioData.cash_balance ??
                portfolioData.balance ??
                portfolioData.available_cash ??
                0
              : null;

          return (
            <li key={u.user_id} className={`fs-user ${isOpen ? 'is-open' : ''}`}>
              {/* 상단 요약 행 */}
              <div className="fs-user__row">
                <div className="fs-user__left">
                  <span className="fs-rank">#{idx + 1}</span>
                  <span className="fs-avatar" aria-hidden />
                  <span className="fs-user__name">{u.username}</span>
                </div>
                <div className="fs-user__right">
                  <div className="fs-user__asset">${money(u.total_asset)}</div>
                  <div className={`fs-user__pnl ${gainPos ? 'is-pos' : 'is-neg'}`}>
                    {gainPos ? '+' : ''}
                    {money(u.pnl ?? 0)} ({pct(u.return_pct)})
                  </div>
                  <button
                    className="fs-chip-btn"
                    onClick={() => handleViewPortfolio(u.user_id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'Close' : 'View'}
                  </button>
                </div>
              </div>

              {/* 펼친 상세 카드 */}
              {isOpen && (
                <div className="fs-userpanel fs-card">
                  <div className="fs-userpanel__head">
                    <div className="fs-userpanel__title">
                      <span className="fs-rank">#{idx + 1}</span>
                      <strong>{u.username}'s Holdings</strong>
                    </div>

                    {/* 🔁 기존 total_asset/pnl 요약 블록 제거 → Cash만 표시 */}
                    <div className="fs-userpanel__meta">
                      {portfolioLoading ? (
                        <div className="text-muted">불러오는 중...</div>
                      ) : (
                        <>
                          <div className="fs-user__cash">
                            <span className="fs-user__cash-label">Cash </span>
                            <strong className="fs-user__cash-amount">
                              ${money(cash ?? 0)}
                            </strong>
                          </div>

                        </>
                      )}
                    </div>
                  </div>

                  {portfolioLoading && <div className="text-muted">불러오는 중...</div>}
                  {!portfolioLoading && portfolioData ? (
                    <div className="fs-userpanel__body">
                      <table className="fs-table">
                        <thead>
                          <tr>
                            <th style={{ width: '20%' }}>Stocks</th>
                            <th style={{ width: '15%' }}>Quantity</th>
                            <th style={{ width: '15%' }}>Avg. Cost($)</th>
                            <th style={{ width: '15%' }}>Current Price($)</th>
                            <th style={{ width: '15%' }}>Market Value($)</th>
                            <th style={{ width: '20%' }}>Gain/Loss</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioData.holdings?.map((h, i) => (
                            <tr className="fs-row" key={i}>
                              <td>
                                {h.symbol} {h.name ? `(${h.name})` : ''}
                              </td>
                              <td>{money(h.quantity)}</td>
                              <td>${money(h.avg_price)}</td>
                              <td>${money(h.current_price)}</td>
                              <td>${money(h.evaluation)}</td>
                              <td className={(h.pnl ?? 0) >= 0 ? 'text-success' : 'text-danger'}>
                                {(h.pnl ?? 0) >= 0 ? '+' : ''}${money(h.pnl)} / {h.pnl_pct}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : !portfolioLoading && !portfolioData ? (
                    <div className="fs-empty">포트폴리오 없음</div>
                  ) : null}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default OtherUsersView;
