import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
      <NavBar />
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
        <Route path="/leagues" element={<Leagues />} />
        <Route path="/my-league" element={<MyLeague />} />
      </Routes>
    </Router>
  );
}

export default App;
