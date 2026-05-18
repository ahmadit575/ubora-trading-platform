import { useEffect, useState } from 'react';
import { Settings, Users, UserPlus, Shield, X } from 'lucide-react';
import api from '../lib/api';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'trader' });
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try { const { data } = await api.get('/auth/users'); setUsers(data.data.users); } catch {}
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', form);
      setShowCreate(false);
      setForm({ name: '', email: '', password: '', role: 'trader' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.patch(`/auth/users/${user._id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch {}
  };

  const handleRoleChange = async (user, role) => {
    try {
      await api.patch(`/auth/users/${user._id}`, { role });
      fetchUsers();
    } catch {}
  };

  const roleColor = { admin: '#f43f5e', trader: '#3b82f6', viewer: '#64748b' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={24} style={{ color: '#f59e0b' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Admin Panel</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><UserPlus size={16} /> Add User</button>
      </div>

      {/* Users Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Name', 'Email', 'Role', 'Status', 'Created', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0' }}>{u.name}</td>
                <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <select className="input-field" style={{ width: '120px', padding: '6px 10px', fontSize: '0.8rem', color: roleColor[u.role] }} value={u.role} onChange={(e) => handleRoleChange(u, e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="trader">Trader</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: u.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', color: u.isActive ? '#10b981' : '#f43f5e' }}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.8rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button className={`btn-sm ${u.isActive ? 'btn-danger' : 'btn-success'}`} onClick={() => handleToggleActive(u)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowCreate(false)}>
          <div className="glass-card" style={{ width: '420px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontWeight: 700, color: '#f1f5f9' }}>Add User</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {error && <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', color: '#f43f5e', fontSize: '0.85rem' }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input className="input-field" placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <input className="input-field" type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              <input className="input-field" type="password" placeholder="Password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              <select className="input-field" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                <option value="trader">Trader</option>
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Create User</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
