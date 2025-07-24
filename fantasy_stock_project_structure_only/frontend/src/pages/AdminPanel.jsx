import React, { useState } from 'react';
import axios from 'axios';

function AdminPanel() {
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    try {
      const res = await axios.post('/api/stocks/reset-season/');
      setMessage(res.data.message);
    } catch (err) {
      setMessage('Season reset failed.');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Admin Panel - Season Control</h2>
      <p>Only managers can access this page to reset the season.</p>
      <button className="btn btn-warning mt-3" onClick={handleReset}>
        Reset Season
      </button>
      {message && <div className="alert alert-info mt-4">{message}</div>}
    </div>
  );
}

export default AdminPanel;
