// frontend/src/App.jsx
import './styles/theme.css';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MarketOverview from './pages/MarketOverview';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import TradeHistory from './pages/TradeHistory';
import Leaderboard from './pages/Leaderboard';
import AdminPanel from './pages/AdminPanel';
import api from './api/axios'; // axios 인스턴스 임포트
import InitializeSeason from './pages/InitializeSeason';
import Leagues from './pages/Leagues';
import MyLeague from './pages/MyLeague';
import History from './pages/History';

// ⬇️ ACTIVE 리그면 Leagues 접근 차단 가드
import BlockIfActiveLeague from './components/BlockIfActiveLeague';

/**
 * 라우팅 내부에서 현재 경로를 확인하고,
 * 특정 경로에서만 NavBar(=좌측 Sidebar)를 숨기는 래퍼 컴포넌트
 */
function AppShell() {
  const location = useLocation();

  // ⬇️ Sidebar 숨길 경로: 랜딩(/), 로그인(/login), 회원가입(/register)
  const hideSidebarRoutes = ['/', '/login', '/register'];
  const showSidebar = !hideSidebarRoutes.includes(location.pathname);

  return (
    <div className={`app ${showSidebar ? 'with-sidebar' : 'no-sidebar'}`}>
      {showSidebar && <NavBar />}

      {/* 본문 래퍼: 사이드바 유무에 따라 좌측 여백을 CSS에서 제어 */}
      <main className="fs-main">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/market" element={<MarketOverview />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/history" element={<History />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/trade-history" element={<TradeHistory />} />
          <Route path="/admin/init-season" element={<InitializeSeason />} />

          {/* ⬇️ 여기만 가드로 감쌌습니다 */}
          <Route
            path="/leagues"
            element={
              <BlockIfActiveLeague>
                <Leagues />
              </BlockIfActiveLeague>
            }
          />

          <Route path="/my-league" element={<MyLeague />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  useEffect(() => {
    const testProxy = async () => {
      try {
        const res = await api.get('/stocks/season-users/', {
          headers: {
            Authorization: `Token ${localStorage.getItem('token')}`,
          },
        });
        console.log('✅ 프록시 테스트 성공:', res.data);
      } catch (err) {
        console.error('❌ 프록시 테스트 실패:', err);
      }
    };

    testProxy();
  }, []);

  return (
    <Router>
      <AppShell />
    </Router>
  );
}

export default App;
