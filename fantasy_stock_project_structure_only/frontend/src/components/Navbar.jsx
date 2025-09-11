import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // NavLink용 클래스 빌더: 활성 시 fs-menu__link--active 추가
  const linkClass = ({ isActive }) =>
    `fs-menu__link${isActive ? ' fs-menu__link--active' : ''}`;

  return (
    <>
      {/* Sidebar */}
      <aside className="fs-sidebar">
        <div className="fs-sidebar__brand">
          <Link to="/" className="fs-brand-link">FantasyStock</Link>
        </div>

        <nav className="fs-sidebar__nav" aria-label="Primary">
          {token && (
            <ul className="fs-menu">
              <li>
                <NavLink className={linkClass} to="/dashboard" end>
                  <span className="fs-menu__icon" aria-hidden>○</span>
                  <span className="fs-menu__text">Dashboard</span>
                </NavLink>
              </li>

              <li>
                {/* 하위 경로(/market/XYZ)도 활성 처리: end 생략 */}
                <NavLink className={linkClass} to="/market">
                  <span className="fs-menu__icon" aria-hidden>○</span>
                  <span className="fs-menu__text">Market</span>
                </NavLink>
              </li>

              <li>
                <NavLink className={linkClass} to="/portfolio">
                  <span className="fs-menu__icon" aria-hidden>○</span>
                  <span className="fs-menu__text">Portfolio</span>
                </NavLink>
              </li>

              <li>
                <NavLink className={linkClass} to="/history">
                  <span className="fs-menu__icon" aria-hidden>○</span>
                  <span className="fs-menu__text">History</span>
                </NavLink>
              </li>

              <li>
                <NavLink className={linkClass} to="/leagues">
                  <span className="fs-menu__icon" aria-hidden>○</span>
                  <span className="fs-menu__text">Leagues</span>
                </NavLink>
              </li>

              <li>
                <NavLink className={linkClass} to="/my-league">
                  <span className="fs-menu__icon" aria-hidden>○</span>
                  <span className="fs-menu__text">My League</span>
                </NavLink>
              </li>
            </ul>
          )}
        </nav>

        <div className="fs-sidebar__bottom">
          {!token ? (
            <div className="d-flex gap-2">
              <Link className="btn btn-outline-secondary btn-sm w-100" to="/login">Login</Link>
              <Link className="btn btn-primary btn-sm w-100" to="/register">Register</Link>
            </div>
          ) : (
            <button className="fs-logout-btn" onClick={handleLogout}>
              <span className="fs-menu__icon" aria-hidden>⎋</span>
              Logout
            </button>
          )}
        </div>
      </aside>

      {/* Spacer to prevent content overlap */}
      <div className="fs-sidebar-spacer" />
    </>
  );
}

export default Navbar;
