import React from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="container mt-5">
      <h2 className="mb-4">Welcome to Fantasy Stock Simulator</h2>
      <p>This is your dashboard. Use the navigation bar to explore features:</p>
      <ul className="list-group mt-3">
        <li className="list-group-item">
          <Link to="/market">📈 Market Overview</Link>
        </li>
        <li className="list-group-item">
          <Link to="/portfolio">💼 My Portfolio</Link>
        </li>
        <li className="list-group-item">
          <Link to="/history">📜 Trade History</Link>
        </li>
      </ul>
    </div>
  );
}

export default Dashboard;
