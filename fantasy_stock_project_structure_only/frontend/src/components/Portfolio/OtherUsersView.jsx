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

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        navigate('/login'); return;
      }
      try {
        const response = await api.get('/stocks/season-users/', {
          headers: { Authorization: `Token ${token}` },
        });
        setUsers(response.data || []);
      } catch (err) {
        console.error('유저 불러오기 실패:', err);
        if (err.response?.status === 401) {
          setError('로그인 정보가 만료되었습니다.'); navigate('/login');
        } else {
          const msg = err?.response?.data?.error || err?.response?.data?.detail || '유저 정보를 불러오지 못했습니다.';
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [navigate]);

  const handleViewPortfolio = async (userId) => {
    if (selectedUserId === userId) {
      setSelectedUserId(null); setPortfolioData(null); return;
    }
    setPortfolioLoading(true); setSelectedUserId(userId);
    try {
      const res = await api.get(`/stocks/user-portfolio/${userId}/`, {
        headers: { Authorization: `Token ${localStorage.getItem('token')}` },
      });
      setPortfolioData(res.data);
    } catch (err) {
      console.error('포트폴리오 불러오기 실패:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.detail || '포트폴리오를 불러오지 못했습니다.';
      setPortfolioData(null); setError(msg);
    } finally {
      setPortfolioLoading(false);
    }
  };

  if (loading) return <div className="text-muted">로딩 중...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  const money = (n) => (n ?? 0).toLocaleString();
  const pct = (n) => `${(n ?? 0) > 0 ? '+' : ''}${n ?? 0}%`;

  return (
    <div className="fs-portfolio__others">
      <ul className="fs-userlist">
        {users.map((u, idx) => {
          const isOpen = selectedUserId === u.user_id;
          const gainPos = (u.return_pct ?? 0) >= 0;
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
                    {gainPos ? '+' : ''}{money(u.pnl ?? 0)} ({pct(u.return_pct)})
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
                    <div className="fs-userpanel__meta">
                      <div className="fs-user__asset">${money(portfolioData?.total_asset)}</div>
                      <div className={`fs-user__pnl ${((portfolioData?.return_pct ?? 0) >= 0) ? 'is-pos':'is-neg'}`}>
                        {(portfolioData?.return_pct ?? 0) >= 0 ? '+' : ''}
                        {money(portfolioData?.pnl ?? 0)} ({pct(portfolioData?.return_pct)})
                      </div>
                      <button className="fs-chip-btn" onClick={() => handleViewPortfolio(u.user_id)}>Close</button>
                    </div>
                  </div>

                  {portfolioLoading && <div className="text-muted">불러오는 중...</div>}
                  {!portfolioLoading && portfolioData ? (
                    <div className="fs-userpanel__body">
                      <table className="fs-table">
                        <thead>
                          <tr>
                            <th>Stocks</th>
                            <th>Quantity</th>
                            <th>Avg. Cost($)</th>
                            <th>Current Price($)</th>
                            <th>Market Value($)</th>
                            <th>Gain/Loss</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolioData.holdings?.map((h, i) => (
                            <tr className="fs-row" key={i}>
                              <td>{h.symbol} {h.name ? `(${h.name})` : ''}</td>
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
