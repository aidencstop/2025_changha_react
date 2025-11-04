import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/accounts/login/', { username, password });
      localStorage.setItem('token', res.data.token);
      navigate('/dashboard');
    } catch (err) {
      alert('Login failed');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '400px' }}>
      <h2 className="mb-4">Login</h2>
      <form onSubmit={handleLogin}>
        <div className="form-group mb-3">
          <label>Username</label>
          <input
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="form-group mb-4">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* 버튼 2개를 같은 줄에 배치 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary w-100"
            type="submit"
            style={{ flex: 1 }}
          >
            Login
          </button>
          <button
            type="button"
            className="btn w-100"
            style={{
              flex: 1,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              color: '#333',
            }}
            onClick={() => navigate('/')}
          >
            Home
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;
