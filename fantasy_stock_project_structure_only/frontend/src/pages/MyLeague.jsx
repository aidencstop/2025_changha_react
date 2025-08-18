import React, { useEffect, useState } from 'react';
import api from '../api/axios';

export default function MyLeague(){
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/leagues/my/');
      setData(data);
    } catch(e){
      setError(e?.response?.data?.detail || 'Failed to load');
    }
  };

  useEffect(()=>{ load(); },[]);

  const leave = async () => {
    if(!data?.in_league) return;
    const id = data.league.id;
    if(!window.confirm('Leave this league?')) return;
    try {
      await api.post(`/leagues/${id}/leave/`);
      alert('Left.');
      load();
    } catch(e){
      alert(e?.response?.data?.detail || 'Leave failed');
    }
  };

  const start = async () => {
    const id = data.league.id;
    if(!window.confirm('Start league now? All members will get initial cash and trading begins.')) return;
    try {
      await api.post(`/leagues/${id}/start/`);
      alert('League started.');
      load();
    } catch(e){
      alert(e?.response?.data?.detail || 'Start failed');
    }
  };

  const end = async () => {
    const id = data.league.id;
    if(!window.confirm('End league now? Final results will be recorded.')) return;
    try {
      await api.post(`/leagues/${id}/end/`);
      alert('League ended.');
      load();
    } catch(e){
      alert(e?.response?.data?.detail || 'End failed');
    }
  };

  if(!data) return <div className="container py-4">Loading...</div>;
  if(!data.in_league) return <div className="container py-4"><h2>My League</h2><div className="alert alert-info">You are not in any league. Go to Leagues to create or join.</div></div>

  const { league, members, is_manager } = data;
  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>My League — {league.name}</h2>
        <span className={`badge bg-${league.status === 'ACTIVE' ? 'success' : league.status === 'DRAFT' ? 'secondary' : 'dark'}`}>{league.status}</span>
      </div>
      <div className="row g-3">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Members</h5>
              <table className="table table-sm">
                <thead>
                  <tr><th>#</th><th>User</th><th>Cash</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {members.map((m,i)=> (
                    <tr key={m.id}>
                      <td>{i+1}</td>
                      <td>{m.username}</td>
                      <td>{Number(m.cash_balance||0).toLocaleString()}</td>
                      <td>{new Date(m.joined_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-body d-grid gap-2">
              <div><strong>Initial Cash:</strong> {Number(league.initial_cash).toLocaleString()}</div>
              <div><strong>Capacity:</strong> {league.current_members}/{league.max_members}</div>
              {is_manager && league.status==='DRAFT' && <button className="btn btn-primary" onClick={start}>Start League</button>}
              {is_manager && league.status==='ACTIVE' && <button className="btn btn-danger" onClick={end}>End League</button>}
              {league.status!=='ENDED' && <button className="btn btn-outline-secondary" onClick={leave}>Leave League</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}