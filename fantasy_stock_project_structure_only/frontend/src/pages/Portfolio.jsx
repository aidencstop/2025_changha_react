import React, { useState } from 'react'
import MyPortfolioView from '../components/Portfolio/MyPortfolioView'
import OtherUsersView from '../components/Portfolio/OtherUsersView'

const Portfolio = () => {
  const [activeTab, setActiveTab] = useState('my')

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-center mb-3">
        <button
          className={`btn btn-${activeTab === 'my' ? 'primary' : 'outline-primary'} mx-2`}
          onClick={() => setActiveTab('my')}
        >
          내 포트폴리오
        </button>
        <button
          className={`btn btn-${activeTab === 'others' ? 'primary' : 'outline-primary'} mx-2`}
          onClick={() => setActiveTab('others')}
        >
          다른 유저 보기
        </button>
      </div>

      {activeTab === 'my' ? <MyPortfolioView /> : <OtherUsersView />}
    </div>
  )
}

export default Portfolio
