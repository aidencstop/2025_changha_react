import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

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
        // 서버가 "Joined." 또는 "Rejoined." 를 돌려줌
        alert(data.detail || 'Joined!');
        navigate('/my-league');
      } catch (e) {
        alert(e?.response?.data?.detail || 'Join failed');
      }
    };

  return (
    <div className="container py-4">
      <h2>Leagues</h2>
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Create a League</h5>
              <form onSubmit={createLeague} className="row g-2">
                <div className="col-12">
                  <label className="form-label">Name</label>
                  <input className="form-control" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Initial Cash</label>
                  <input type="number" className="form-control" value={form.initial_cash}
                         onChange={e=>setForm({...form, initial_cash:Number(e.target.value)})} min={0} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Max Members</label>
                  <input type="number" className="form-control" value={form.max_members}
                         onChange={e=>setForm({...form, max_members:Number(e.target.value)})} min={2} max={500} />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" type="submit">Create</button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <h5>Open Leagues</h5>
          {loading ? <p>Loading...</p> : (
            <div className="list-group">
              {leagues.length === 0 && <div className="text-muted">No draft leagues.</div>}
              {leagues.map(l => (
                <div key={l.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{l.name}</div>
                    <div className="small text-muted">Members: {l.current_members}/{l.max_members} · Init: {Number(l.initial_cash).toLocaleString()}</div>
                  </div>
                  <button className="btn btn-outline-primary" onClick={()=>join(l.id)} disabled={!l.is_joinable}>Join</button>
                </div>
              ))}
            </div>
          )}
          {error && <div className="alert alert-danger mt-3">{error}</div>}
        </div>
      </div>
    </div>
  );
}