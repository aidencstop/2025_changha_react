import React, { useEffect, useState } from 'react';
import MyPortfolioView from '../components/Portfolio/MyPortfolioView';
import OtherUsersView from '../components/Portfolio/OtherUsersView';
import api from '../api/axios';
import './Portfolio.css';

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState('my');

  // ── Header Right (잔고 + 이니셜)
  const [leagueCash, setLeagueCash] = useState(null);
  const [loadingCash, setLoadingCash] = useState(true);
  const [userInitials, setUserInitials] = useState('GU');

  useEffect(() => {
    // 1) 프로필 이니셜
    (async () => {
      try {
        const res = await api.get('/accounts/profile/');
        const fn = res.data?.first_name || 'G';
        const ln = res.data?.last_name || 'U';
        const initials = `${(fn[0] || 'G')}${(ln[0] || 'U')}`.toUpperCase();
        setUserInitials(initials);
      } catch {
        setUserInitials('GU');
      }
    })();

    // 2) 리그 잔고
    (async () => {
      try {
        const res = await api.get('/stocks/my-portfolio/');
        setLeagueCash(res.data?.cash ?? 0);
      } catch (err) {
        if (err?.response?.status === 404) {
          setLeagueCash(null); // 리그 없음
        } else {
          console.error('[Portfolio] fetch cash error:', err);
        }
      } finally {
        setLoadingCash(false);
      }
    })();
  }, []);

  const money = (n = 0) =>
    Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <main className="fs-page fs-page--fluid fs-portfolio">
      {/* Page Header */}
      <div className="fs-page-header">
        <div>
          <h1 className="fs-title">Portfolio</h1>
          <p className="fs-sub">Manage and explore investment portfolios</p>
        </div>

        {/* ⬅️ 여기가 Profile의 fs-profile__header-right와 같은 블록 */}
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
          <div className="fs-profile__avatar-mini" aria-label="User initials">
            {userInitials}
          </div>
        </div>
      </div>

      {/* ⬇️ 가운데 정렬된 토글(세그먼트) */}
      <div className="fs-seg-row">
        <div className="fs-seg" role="tablist" aria-label="Portfolio toggle">
          <button
            type="button"
            className={`fs-seg__btn ${activeTab === 'my' ? 'is-active' : ''}`}
            aria-pressed={activeTab === 'my'}
            onClick={() => setActiveTab('my')}
          >
            My Portfolio
          </button>
          <button
            type="button"
            className={`fs-seg__btn ${activeTab === 'others' ? 'is-active' : ''}`}
            aria-pressed={activeTab === 'others'}
            onClick={() => setActiveTab('others')}
          >
            User Portfolio
          </button>
        </div>
      </div>

      {/* 콘텐츠 카드 (제목 제거) */}
      <section className="fs-card">
        <div className="fs-card-body">
          {activeTab === 'my' ? <MyPortfolioView /> : <OtherUsersView />}
        </div>
      </section>
    </main>
  );
};

export default Portfolio;
