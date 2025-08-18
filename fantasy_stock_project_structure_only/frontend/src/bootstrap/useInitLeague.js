// frontend/src/bootstrap/useInitLeague.js
import { useEffect } from 'react';
import api from '../api/axios';
import { setSelectedLeagueId } from '../utils/league';

export default function useInitLeague() {
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        // ⬇️ MyLeagueView.get에 매핑된 URL 사용 (예: /api/leagues/my/)
        const res = await api.get('/api/leagues/my/', {
          headers: { Authorization: `Token ${token}` }
        });
        if (res?.data?.in_league && res?.data?.league?.id) {
          setSelectedLeagueId(res.data.league.id);
        }
      } catch {
        // 현재 리그 없으면 무시
      }
    })();
  }, []);
}
