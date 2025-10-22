import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';
import './Leagues.css'; // ✅ 추가

export default function Leagues() {
  const [leagues, setLeagues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', initial_cash: 100000, max_members: 20 });
  const navigate = useNavigate();

  const fetchLeagues = async () => {
    try {
      const { data } = await api.get('/leagues/');
      setLeagues(data);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to load leagues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeagues(); }, []);

  const createLeague = async (e) => {
    e.preventDefault();
    try {
      await api.post('/leagues/', form);
      alert('League created. You are the manager and auto-joined.');
      navigate('/my-league');
    } catch (e) {
      alert(e?.response?.data?.detail || 'Create failed');
    }
  };

  const join = async (id) => {
    try {
      const { data } = await api.post(`/leagues/${id}/join/`);
      alert(data.detail || 'Joined!');
      navigate('/my-league');
    } catch (e) {
      alert(e?.response?.data?.detail || 'Join failed');
    }
  };

  const money = (n) => (Number(n || 0)).toLocaleString();

  return (
    <div className="fs-page fs-leagues">
      <div className="fs-grid">
        {/* 좌측: Create a League */}
        <section className="fs-card">
          <div className="fs-card-head">
            <div>
              <div className="fs-card-title">Create a League</div>
              <div className="fs-card-sub">초기 현금/정원 지정 후 리그를 개설하세요.</div>
            </div>
          </div>
          <div className="fs-card-body">
            <form onSubmit={createLeague} className="fs-form row g-3">
              <div className="col-12">
                <label className="form-label">Name</label>
                <input
                  className="form-control"
                  value={form.name}
                  onChange={(e)=>setForm({...form, name:e.target.value})}
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Initial Cash</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.initial_cash}
                  onChange={(e)=>setForm({...form, initial_cash:Number(e.target.value)})}
                  min={0}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Max Members</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.max_members}
                  onChange={(e)=>setForm({...form, max_members:Number(e.target.value)})}
                  min={2}
                  max={500}
                />
              </div>
              <div className="col-12 fs-actions">
                <button className="fs-btn fs-btn-primary" type="submit">Create</button>
              </div>
            </form>
          </div>
        </section>

        {/* 우측: Open Leagues */}
        <section>
          <div className="fs-card">
            <div className="fs-card-head">
              <div>
                <div className="fs-card-title">Open Leagues</div>
                <div className="fs-card-sub">참여 가능한 리그 목록입니다.</div>
              </div>
            </div>
            <div className="fs-card-body">
              {loading ? (
                <div className="text-muted">Loading...</div>
              ) : (
                <>
                  {leagues?.length === 0 ? (
                    <div className="fs-empty">No draft leagues.</div>
                  ) : (
                    <div className="fs-list">
                      {leagues.map(l => {
                        const full = (l.current_members ?? 0) >= (l.max_members ?? 0);
                        return (
                          <div key={l.id} className="fs-list-item">
                            <div className="fs-li-left">
                              <div className="fs-li-title">
                                {l.name}{' '}
                                {full ? (
                                  <span className="badge-full">FULL</span>
                                ) : (
                                  <span className="badge-ok">OPEN</span>
                                )}
                              </div>
                              <div className="fs-li-meta">
                                Members: {l.current_members}/{l.max_members} · Init: ${money(l.initial_cash)}
                              </div>
                            </div>
                            <div className="fs-join">
                              <button
                                className="fs-btn fs-btn-ghost"
                                onClick={()=>join(l.id)}
                                disabled={!l.is_joinable}
                                aria-disabled={!l.is_joinable}
                              >
                                Join
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
              {error && <div className="alert alert-danger mt-3">{error}</div>}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
