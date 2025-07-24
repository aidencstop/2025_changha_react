import React, { useEffect, useState } from 'react';
import axios from 'axios';

function Leaderboard() {
  const [leaders, setLeaders] = useState([]);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await axios.get('/api/stocks/leaderboard/');
      setLeaders(res.data);
    } catch (err) {
      console.error('Failed to load leaderboard');
    }
  };

  return (
    <div className="container mt-5">
      <h2>Leaderboard</h2>
      <table className="table table-striped mt-3">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Portfolio Value</th>
            <th>Profit</th>
          </tr>
        </thead>
        <tbody>
          {leaders.map((user, idx) => (
            <tr key={idx}>
              <td>{idx + 1}</td>
              <td>{user.username}</td>
              <td>${user.portfolio_value.toFixed(2)}</td>
              <td className={user.profit >= 0 ? 'text-success' : 'text-danger'}>
                {user.profit >= 0 ? '+' : ''}${user.profit.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
