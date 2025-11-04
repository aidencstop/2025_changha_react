// frontend/src/pages/Profile.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import './Profile.css';

export default function Profile() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw,     setNewPw]     = useState('');

  // 헤더 우측 표시용
  const [availableBalance] = useState(85750);
  const [userInitials, setUserInitials] = useState('DU');

  // ✅ 아바타 URL 상태
  const [avatarUrl, setAvatarUrl] = useState('');
  // 파일 입력 ref
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const tk = localStorage.getItem('token');
        console.log('[Profile] token in LS =', tk);

        const res = await api.get('/accounts/profile/');
        console.log('[Profile] GET /accounts/profile/', res.status, res.data);

        setFirstName(res.data.first_name || '');
        setLastName(res.data.last_name || '');
        setEmail(res.data.email || '');

        // 이니셜 계산(간단 예시)
        const initial = `${(res.data.first_name || 'D')[0] ?? 'D'}${(res.data.last_name || 'U')[0] ?? 'U'}`;
        setUserInitials(initial.toUpperCase());

        // ✅ 아바타 URL 반영
        setAvatarUrl(res.data.avatar_url || '');
      } catch (e) {
        console.log('[Profile] error status=', e?.response?.status, 'data=', e?.response?.data);
        alert('프로필 정보를 불러오지 못했습니다. 로그인 상태를 확인해주세요.');
      }
    })();
  }, []);

  function money(n = 0) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  const handleCancel = () => navigate('/dashboard');

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        first_name: firstName,
        last_name:  lastName,
        email,
        current_password: currentPw,
        new_password: newPw,
      };

      const res = await api.put('/accounts/profile/', payload);
      const { message, password_changed, reload, user } = res.data || {};

      setCurrentPw('');
      setNewPw('');

      if (user) {
        setFirstName(user.first_name || '');
        setLastName(user.last_name || '');
        setEmail(user.email || '');
        // ✅ 서버 응답에 avatar_url 포함
        if (user.avatar_url !== undefined) setAvatarUrl(user.avatar_url || '');
      }

      alert(message || 'Done');

      if (reload) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail
        || (typeof err?.response?.data === 'string' ? err.response.data : 'Update failed');
      alert(msg);
    }
  };

  // ✅ 아바타 업로드(✎ 버튼 → 파일 선택 → 즉시 업로드)
  const handleAvatarEditClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/accounts/profile/avatar/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrl = res?.data?.avatar_url || res?.data?.user?.avatar_url || '';
      if (newUrl) setAvatarUrl(newUrl);

      alert('Avatar updated');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.detail || 'Avatar upload failed';
      alert(msg);
    } finally {
      // 같은 파일 다시 선택 가능하게 초기화
      e.target.value = '';
    }
  };

  return (
    <div id="fs-profile" className="fs-page">
      {/* Header */}
      <div className="fs-profile__headerwrap">
        <div className="fs-profile__header-left">
          <div className="fs-profile__title">Profile Settings</div>
          <div className="fs-profile__subtitle">Manage your profile information</div>
        </div>

        <div className="fs-profile__header-right">
          <div className="fs-profile__balanceblock">
            <div className="fs-profile__balance-label">Available Balance</div>
            <div className="fs-profile__balance-amount">${money(availableBalance)}</div>
          </div>
          <div className="fs-profile__avatar-mini">{userInitials}</div>
        </div>
      </div>

      {/* Card/Form */}
      <div className="fs-profile__card">
        <form className="fs-profile__form" onSubmit={handleUpdate}>
          {/* left avatar column */}
          <div className="fs-profile__avatar-col">
            <div className="fs-profile__avatar-main">
              <div className="fs-profile__avatar-circle">
                {/* ✅ 이미지가 있으면 img, 없으면 이니셜/문자 */}
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="fs-profile__avatar-img" />
                ) : (
                  <span className="fs-profile__avatar-letter">{userInitials?.[0] || 'G'}</span>
                )}
              </div>

              <button
                type="button"
                className="fs-profile__avatar-edit"
                title="Change avatar"
                onClick={handleAvatarEditClick}
              >
                ✎
              </button>

              {/* 숨겨진 파일 입력 */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleAvatarFileChange}
              />
            </div>
          </div>

          {/* actions row */}
          <div className="fs-profile__actions">
            <button type="button" className="fs-profile__btn fs-profile__btn--ghost" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="fs-profile__btn fs-profile__btn--primary">
              Update
            </button>
          </div>

          {/* fields row */}
          <div className="fs-profile__fields-col">
            {/* Name row */}
            <div className="fs-profile__rowline">
              <div className="fs-profile__rowline-label">Name</div>
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
              <div className="fs-profile__rowline-label">Email</div>
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
              <div className="fs-profile__rowline-label">Password</div>
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
