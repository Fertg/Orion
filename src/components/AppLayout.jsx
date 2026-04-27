import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Logo, WordMark } from './Logo.jsx';
import './AppLayout.css';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo size={24} />
          <WordMark />
        </div>

        <nav className="nav">
          <NavLink to="/" end className="nav-item">
            Resumen
          </NavLink>
          <NavLink to="/historico" className="nav-item">
            Histórico
          </NavLink>
          <NavLink to="/ajustes" className="nav-item">
            Ajustes
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          {user && (
            <>
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
              <button onClick={handleLogout} className="btn-ghost logout-btn">
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
