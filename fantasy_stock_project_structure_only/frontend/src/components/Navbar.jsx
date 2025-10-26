import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleBrandClick = () => {
    if (token) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  const linkClass = ({ isActive }) =>
    `fs-menu__link${isActive ? ' fs-menu__link--active' : ''}`;

  return (
    <>
      <aside className="fs-sidebar">
        <div className="fs-sidebar__brand">
          {/* ✅ GROWLIO 버튼 (볼드, 테두리·배경 없음) */}
          <button
            onClick={handleBrandClick}
            style={{
              background: 'none',
              border: 'none',
              fontWeight: 800,
              fontSize: '22px',
              color: '#000',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            GROWLIO
          </button>
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

      <div className="fs-sidebar-spacer" />
    </>
  );
}

export default Navbar;
