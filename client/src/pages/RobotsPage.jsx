import { useEffect, useState } from 'react';
import { Bot, Plus, Play, Pause, Square, FileText, X } from 'lucide-react';
import api from '../lib/api';
import { useSocket } from '../contexts/SocketContext';

export default function RobotsPage() {
  const [robots, setRobots] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [logs, setLogs] = useState(null);
  const [form, setForm] = useState({ name: '', platform: 'pocket_option', strategy: 'scalping', config: { pairs: ['BTC/USDT'], lotSize: 0.01, maxOpenTrades: 3, slPercent: 1, tpPercent: 2, gmtSessionFilter: ['london', 'new_york'] } });
  const { socket } = useSocket();

  const fetchRobots = async () => {
    try { const { data } = await api.get('/robots'); setRobots(data.data.robots); } catch {}
  };

  useEffect(() => { fetchRobots(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('robot:status', () => fetchRobots());
    return () => socket.off('robot:status');
  }, [socket]);

  const handleAction = async (id, action) => {
    try { await api.patch(`/robots/${id}/${action}`); fetchRobots(); } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/robots', form);
      setShowCreate(false);
      setForm({ name: '', platform: 'pocket_option', strategy: 'scalping', config: { pairs: ['BTC/USDT'], lotSize: 0.01, maxOpenTrades: 3, slPercent: 1, tpPercent: 2, gmtSessionFilter: ['london', 'new_york'] } });
      fetchRobots();
    } catch {}
  };

  const viewLogs = async (id) => {
    try { const { data } = await api.get(`/robots/${id}/logs`); setLogs({ id, logs: data.data.logs }); } catch {}
  };

  const statusColor = { running: '#10b981', paused: '#f59e0b', stopped: '#64748b', offline: '#f43f5e' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Bot size={24} style={{ color: '#8b5cf6' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Robot Manager</h1>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus size={16} /> New Robot</button>
      </div>

      {/* Robot Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {robots.map((r) => (
          <div key={r._id} className="glass-card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>{r.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>{r.platform.replace('_', ' ')} • {r.strategy}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`status-led status-${r.status}`} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: statusColor[r.status], textTransform: 'capitalize' }}>{r.status}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '0.8rem' }}>
              <div><span style={{ color: '#64748b' }}>Pairs:</span> <span style={{ color: '#cbd5e1' }}>{r.config?.pairs?.join(', ')}</span></div>
              <div><span style={{ color: '#64748b' }}>Lot:</span> <span style={{ color: '#cbd5e1' }}>{r.config?.lotSize}</span></div>
              <div><span style={{ color: '#64748b' }}>Max Trades:</span> <span style={{ color: '#cbd5e1' }}>{r.config?.maxOpenTrades}</span></div>
              <div><span style={{ color: '#64748b' }}>SL/TP:</span> <span style={{ color: '#cbd5e1' }}>{r.config?.slPercent}% / {r.config?.tpPercent}%</span></div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {r.status !== 'running' && <button className="btn-sm btn-success" onClick={() => handleAction(r._id, 'start')}><Play size={12} /> Start</button>}
              {r.status === 'running' && <button className="btn-sm btn-secondary" onClick={() => handleAction(r._id, 'pause')}><Pause size={12} /> Pause</button>}
              {r.status !== 'stopped' && <button className="btn-sm btn-danger" onClick={() => handleAction(r._id, 'stop')}><Square size={12} /> Stop</button>}
              <button className="btn-sm btn-secondary" onClick={() => viewLogs(r._id)}><FileText size={12} /> Logs</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowCreate(false)}>
          <div className="glass-card" style={{ width: '480px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ fontWeight: 700, color: '#f1f5f9' }}>Create Robot</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input className="input-field" placeholder="Robot Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              <select className="input-field" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                <option value="pocket_option">Pocket Option</option>
                <option value="mt5">MT5</option>
              </select>
              <select className="input-field" value={form.strategy} onChange={e => setForm(f => ({ ...f, strategy: e.target.value }))}>
                <option value="scalping">Scalping</option>
                <option value="daily">Daily</option>
              </select>
              <input className="input-field" placeholder="Pairs (comma-separated)" value={form.config.pairs.join(',')} onChange={e => setForm(f => ({ ...f, config: { ...f.config, pairs: e.target.value.split(',').map(p => p.trim()) } }))} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Lot Size</label>
                  <input className="input-field" type="number" step="0.01" value={form.config.lotSize} onChange={e => setForm(f => ({ ...f, config: { ...f.config, lotSize: +e.target.value } }))} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>Max Open Trades</label>
                  <input className="input-field" type="number" value={form.config.maxOpenTrades} onChange={e => setForm(f => ({ ...f, config: { ...f.config, maxOpenTrades: +e.target.value } }))} />
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }}>Create Robot</button>
            </form>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setLogs(null)}>
          <div className="glass-card" style={{ width: '600px', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontWeight: 700, color: '#f1f5f9' }}>Trade Logs</h2>
              <button onClick={() => setLogs(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            {logs.logs.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>No trade logs yet</p>
            ) : (
              logs.logs.map((l) => (
                <div key={l._id} className="glass-card-sm" style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#e2e8f0' }}>{l.signalId?.pair} {l.signalId?.direction}</span>
                    <span style={{ color: l.usdtPnL >= 0 ? '#10b981' : '#f43f5e', fontWeight: 700 }}>{l.usdtPnL >= 0 ? '+' : ''}{l.usdtPnL} USDT</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
