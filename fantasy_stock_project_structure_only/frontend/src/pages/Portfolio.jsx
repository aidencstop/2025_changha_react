import React, { useState } from 'react';
import MyPortfolioView from '../components/Portfolio/MyPortfolioView';
import OtherUsersView from '../components/Portfolio/OtherUsersView';
import './Portfolio.css';

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState('my');

  return (
    <main className="fs-page fs-page--fluid fs-portfolio">
      {/* Page Header */}
      <div className="fs-page-header">
        <div>
          <h1 className="fs-title">Portfolio</h1>
          <p className="fs-sub">Manage and explore investment portfolios</p>
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
