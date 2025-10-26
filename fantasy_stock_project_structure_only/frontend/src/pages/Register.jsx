import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/accounts/register/', { username, password });
      alert('Registration successful!');
      navigate('/login');
    } catch (err) {
      alert('Registration failed');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '400px' }}>
      <h2 className="mb-4">Register</h2>
      <form onSubmit={handleRegister}>
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
            Register
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
            Back
          </button>
        </div>
      </form>
    </div>
  );
}

export default Register;
