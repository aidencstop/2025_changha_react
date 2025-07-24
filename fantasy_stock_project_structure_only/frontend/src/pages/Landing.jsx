import React from 'react';
import { Link } from 'react-router-dom';

function Landing() {
  return (
    <div className="container text-center mt-5">
      <h1>🎯 Welcome to Fantasy Stock Simulator</h1>
      <p className="lead">Compete with others in a fantasy league using real S&P 500 stocks.</p>
      <div className="mt-4">
        <Link to="/login" className="btn btn-primary mx-2">Login</Link>
        <Link to="/register" className="btn btn-success mx-2">Register</Link>
      </div>
    </div>
  );
}

export default Landing;
