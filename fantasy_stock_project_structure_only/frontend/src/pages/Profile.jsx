// frontend/src/pages/Profile.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();

  // 실제로는 API에서 불러와야 할 값들
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');

  // TODO: 실제 값으로 교체 예정
  const availableBalance = 85750;
  const userInitials = 'DU';

  function money(n = 0) {
    return Number(n).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  const handleCancel = () => {
    navigate('/dashboard');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    // TODO: 백엔드 연결
    alert('Profile updated (stub)');
  };

  return (
    <div id="fs-profile" className="fs-page">
      {/* ───────── Header 영역 ───────── */}
      <div className="fs-profile__headerwrap">
        <div className="fs-profile__header-left">
          <div className="fs-profile__title">Profile Settings</div>
          <div className="fs-profile__subtitle">
            Manage your profile information
          </div>
        </div>

        <div className="fs-profile__header-right">
          <div className="fs-profile__balanceblock">
            <div className="fs-profile__balance-label">Available Balance</div>
            <div className="fs-profile__balance-amount">
              ${money(availableBalance)}
            </div>
          </div>
          <div className="fs-profile__avatar-mini">
            {userInitials}
          </div>
        </div>
      </div>

      {/* ───────── Card/Form 영역 ───────── */}
      <div className="fs-profile__card">
        <form className="fs-profile__form" onSubmit={handleUpdate}>
          {/* left avatar column */}
          <div className="fs-profile__avatar-col">
            <div className="fs-profile__avatar-main">
              <div className="fs-profile__avatar-circle">
                <span className="fs-profile__avatar-letter">G</span>
              </div>
              <button
                type="button"
                className="fs-profile__avatar-edit"
                title="Change avatar"
              >
                ✎
              </button>
            </div>
          </div>

          {/* right fields column */}
          <div className="fs-profile__fields-col">
            {/* actions row */}
            <div className="fs-profile__actions">
              <button
                type="button"
                className="fs-profile__btn fs-profile__btn--ghost"
                onClick={handleCancel}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="fs-profile__btn fs-profile__btn--primary"
              >
                Update
              </button>
            </div>

            {/* Name row (label + inputs on same line) */}
            <div className="fs-profile__rowline">
              <div className="fs-profile__rowline-label">
                Name
              </div>
              <div className="fs-profile__rowline-fields fs-profile__rowline-fields--2col">
                <input
                  className="fs-profile__input"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
                <input
                  className="fs-profile__input"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            {/* Email row */}
            <div className="fs-profile__rowline">
              <div className="fs-profile__rowline-label">
                Email
              </div>
              <div className="fs-profile__rowline-fields">
                <input
                  className="fs-profile__input"
                  placeholder="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password row */}
            <div className="fs-profile__rowline">
              <div className="fs-profile__rowline-label">
                Password
              </div>
              <div className="fs-profile__rowline-fields fs-profile__rowline-fields--2col">
                <input
                  className="fs-profile__input"
                  placeholder="Current password"
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                />
                <input
                  className="fs-profile__input"
                  placeholder="New password"
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                />
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
