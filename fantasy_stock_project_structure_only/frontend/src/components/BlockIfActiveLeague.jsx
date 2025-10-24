// frontend/src/components/BlockIfActiveLeague.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function BlockIfActiveLeague({ children }) {
  const [state, setState] = useState({ loading: true, blocked: false, isManager: false });
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get('/leagues/my/');
        const status = data?.league?.status; // 'DRAFT' | 'ACTIVE' | 'ENDED'
        const isManager = !!data?.is_manager;

        if (!alive) return;
        if (status === 'ACTIVE') {
          setState({ loading: false, blocked: true, isManager });
        } else {
          setState({ loading: false, blocked: false, isManager });
        }
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, blocked: false, isManager: false });
      }
    })();
    return () => { alive = false; };
  }, []);

  // History.jsx 톤 + 정중앙 배치
  const pageStyle = {
  minHeight: '100vh',
  background: '#f3f4f8',
  color: '#0f1222',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  boxSizing: 'border-box',
  padding: '24px 16px',
  overflowX: 'hidden', // 안전장치
};

  const cardWrapStyle = {
  width: 'min(100%, 720px)', // 100%를 넘지 않도록
};

  const cardStyle = {
    background: '#ffffff',
    border: '1px solid rgba(15,18,34,0.08)',
    borderRadius: 16,
    boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
    padding: 24,
    textAlign: 'left',
  };

  if (state.loading) {
    return (
      <main className="fs-page fs-page--fluid" style={pageStyle}>
        <div style={cardWrapStyle}>
          <div className="fs-card" style={{ ...cardStyle, borderColor: 'transparent' }}>
            <div className="fs-empty">Loading…</div>
          </div>
        </div>
      </main>
    );
  }

  if (state.blocked) {
    return (
      <main className="fs-page fs-page--fluid" style={pageStyle}>
        <div style={cardWrapStyle}>
          <div className="fs-card" style={cardStyle}>
            <div className="fs-card-head" style={{ marginBottom: 8 }}>
              <div className="fs-card-title" style={{ fontSize: 18, fontWeight: 800 }}>
                Access blocked
              </div>
            </div>
            <div className="fs-sub" style={{ color: '#0f1222', lineHeight: 1.6 }}>
              A league is already in progress. To start a new league or join another league, please{' '}
              <b>end the current league</b> or <b>leave the league</b>.
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <button className="fs-btn fs-btn-light" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </button>
              {state.isManager ? (
                <button className="fs-btn fs-btn-primary" onClick={() => navigate('/my-league')}>
                  View My League
                </button>
              ) : (
                <button className="fs-btn fs-btn-primary" onClick={() => navigate('/my-league')}>
                  View My League
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return children;
}
