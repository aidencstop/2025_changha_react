import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [errMsg, setErrMsg]       = useState('');
  const navigate = useNavigate();

  const emailValid = (v) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const canSubmit =
    username.trim() &&
    emailValid(email) &&
    password &&
    confirm &&
    password === confirm;

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrMsg('');

    if (password !== confirm) {
      setErrMsg('Passwords do not match.');
      return;
    }
    if (!emailValid(email)) {
      setErrMsg('Please enter a valid email.');
      return;
    }

    try {
      await axios.post('/api/accounts/register/', {
        username,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });
      alert('Registration successful!');
      navigate('/login');
    } catch (err) {
      setErrMsg('Registration failed');
      alert('Registration failed');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '480px' }}>
      <h2 className="mb-4">Register</h2>

      {errMsg && (
        <div className="alert alert-danger py-2" role="alert">
          {errMsg}
        </div>
      )}

      <form onSubmit={handleRegister} noValidate>
        <div className="form-group mb-3">
          <label>Username</label>
          <input
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="form-group mb-3">
          <label>First Name</label>
          <input
            className="form-control"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>

        <div className="form-group mb-3">
          <label>Last Name</label>
          <input
            className="form-control"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </div>

        <div className="form-group mb-3">
          <label>Email</label>
          <input
            type="email"
            className={`form-control ${email && !emailValid(email) ? 'is-invalid' : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {email && !emailValid(email) && (
            <div className="invalid-feedback">Invalid email format.</div>
          )}
        </div>

        <div className="form-group mb-3">
          <label>Password</label>
          <input
            type="password"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="form-group mb-4">
          <label>Confirm Password</label>
          <input
            type="password"
            className={`form-control ${confirm && confirm !== password ? 'is-invalid' : ''}`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          {confirm && confirm !== password && (
            <div className="invalid-feedback">Passwords do not match.</div>
          )}
        </div>

        {/* 버튼 2개를 같은 줄에 배치 */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-primary w-100"
            type="submit"
            style={{ flex: 1 }}
            disabled={!canSubmit}
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
            Home
          </button>
        </div>
      </form>
    </div>
  );
}

export default Register;
