// frontend/src/components/Portfolio/OtherUsersView.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios'; // ✅ 정확한 경로

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
        navigate('/login');
        return;
      }

      try {
        const response = await api.get('/stocks/season-users/', {
          headers: { Authorization: `Token ${token}` },
        });
        setUsers(response.data);
      } catch (err) {
        console.error('유저 불러오기 실패:', err);
        if (err.response?.status === 401) {
          setError('로그인 정보가 만료되었습니다.');
          navigate('/login');
        } else {
          setError('유저 정보를 불러오지 못했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [navigate]);

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
        headers: {
          Authorization: `Token ${localStorage.getItem('token')}`,
        },
      });
      setPortfolioData(res.data);
    } catch (err) {
      console.error('포트폴리오 불러오기 실패:', err);
      setPortfolioData(null);
    } finally {
      setPortfolioLoading(false);
    }
  };

  if (loading) return <div className="container mt-4">로딩 중...</div>;
  if (error) return <div className="container mt-4 text-danger">{error}</div>;

  return (
    <div className="container mt-4">
      <h3>다른 유저들의 시즌 포트폴리오</h3>
      <table className="table table-striped mt-3">
        <thead>
          <tr>
            <th>순위</th>
            <th>유저명</th>
            <th>수익률</th>
            <th>보기</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, idx) => (
            <React.Fragment key={user.user_id}>
              <tr>
                <td>{idx + 1}</td>
                <td>{user.username}</td>
                <td>{user.return_pct}%</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => handleViewPortfolio(user.user_id)}
                  >
                    {selectedUserId === user.user_id ? '닫기' : '보기'}
                  </button>
                </td>
              </tr>
              {selectedUserId === user.user_id && (
                <tr>
                  <td colSpan="4">
                    {portfolioLoading ? (
                      <div>불러오는 중...</div>
                    ) : portfolioData ? (
                      <div className="mt-3">
                        <p><strong>총 자산:</strong> {portfolioData.total_asset.toLocaleString()} 원</p>
                        <p><strong>시작 금액:</strong> {portfolioData.starting_cash.toLocaleString()} 원</p>
                        <p><strong>수익률:</strong> {portfolioData.return_pct}%</p>

                        <table className="table table-sm mt-3">
                          <thead>
                            <tr>
                              <th>종목</th>
                              <th>수량</th>
                              <th>평단가</th>
                              <th>현재가</th>
                              <th>평가액</th>
                              <th>PnL</th>
                              <th>PnL%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {portfolioData.holdings.map((h, i) => (
                              <tr key={i}>
                                <td>{h.symbol} ({h.name})</td>
                                <td>{h.quantity}</td>
                                <td>{h.avg_price.toFixed(2)}</td>
                                <td>{h.current_price.toFixed(2)}</td>
                                <td>{h.evaluation.toLocaleString()}</td>
                                <td>{h.pnl.toLocaleString()}</td>
                                <td>{h.pnl_pct}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div>포트폴리오 없음</div>
                    )}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OtherUsersView;
