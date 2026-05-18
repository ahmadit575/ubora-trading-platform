import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { LayoutDashboard, Signal, Bot, Wallet, Settings, LogOut, TrendingUp, Wifi, WifiOff } from 'lucide-react';

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const { connected } = useSocket();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'trader', 'viewer'] },
    { to: '/signals', icon: Signal, label: 'Signals', roles: ['admin', 'trader', 'viewer'] },
    { to: '/robots', icon: Bot, label: 'Robots', roles: ['admin', 'trader'] },
    { to: '/staking', icon: Wallet, label: 'Staking', roles: ['admin', 'trader'] },
    { to: '/admin', icon: Settings, label: 'Admin', roles: ['admin'] },
  ];

  const navLinkStyle = (isActive) => ({
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 16px', borderRadius: '10px',
    color: isActive ? '#f1f5f9' : '#64748b',
    background: isActive ? 'rgba(59,130,246,0.12)' : 'transparent',
    borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
    textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
    transition: 'all 0.2s ease',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'var(--color-dark-900)', borderRight: '1px solid var(--color-glass-border)', padding: '20px 16px', display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 40 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', marginBottom: '32px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f1f5f9' }}>Ubora Trading</div>
            <div style={{ fontSize: '0.65rem', color: '#475569' }}>AI Platform v1.0</div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {links.filter(l => l.roles.some(r => user?.role === r)).map((link) => (
            <NavLink key={link.to} to={link.to} style={({ isActive }) => navLinkStyle(isActive)}>
              <link.icon size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ borderTop: '1px solid var(--color-glass-border)', paddingTop: '16px' }}>
          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', marginBottom: '12px' }}>
            {connected ? <Wifi size={14} style={{ color: '#10b981' }} /> : <WifiOff size={14} style={{ color: '#f43f5e' }} />}
            <span style={{ fontSize: '0.75rem', color: connected ? '#10b981' : '#f43f5e' }}>{connected ? 'Live' : 'Disconnected'}</span>
          </div>

          {/* User info */}
          <div style={{ padding: '8px 12px', marginBottom: '8px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>{user?.name}</div>
            <div style={{ fontSize: '0.7rem', color: '#475569' }}>{user?.role} • {user?.email}</div>
          </div>

          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, width: '100%', transition: 'color 0.2s' }} onMouseEnter={e => e.target.style.color = '#f43f5e'} onMouseLeave={e => e.target.style.color = '#64748b'}>
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: '260px', padding: '24px 32px', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
