import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Bot, Play, Pause, Square } from 'lucide-react';
import api from '../lib/api';

export default function RobotStatusBar() {
  const [robots, setRobots] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/robots');
        setRobots(data.data.robots);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleStatus = ({ robotId, status }) => {
      setRobots(prev => prev.map(r => r._id === robotId ? { ...r, status } : r));
    };
    socket.on('robot:status', handleStatus);
    return () => socket.off('robot:status', handleStatus);
  }, [socket]);

  const handleAction = async (id, action) => {
    try {
      await api.patch(`/robots/${id}/${action}`);
    } catch {}
  };

  const statusClass = (s) => {
    const map = { running: 'status-running', paused: 'status-paused', stopped: 'status-stopped', offline: 'status-offline' };
    return map[s] || 'status-stopped';
  };

  const platformIcon = (p) => p === 'pocket_option' ? '🎯' : '📊';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Bot size={18} style={{ color: '#8b5cf6' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Robot Fleet</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {robots.length === 0 ? (
          <div className="glass-card-sm" style={{ textAlign: 'center', color: '#64748b', padding: '30px' }}>
            No robots configured yet
          </div>
        ) : (
          robots.map((robot) => (
            <div key={robot._id} className="glass-card-sm animate-slide-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className={`status-led ${statusClass(robot.status)}`} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>{robot.name}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    {platformIcon(robot.platform)} {robot.platform.replace('_', ' ')} • {robot.strategy}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {robot.status !== 'running' && (
                  <button className="btn-sm btn-success" onClick={() => handleAction(robot._id, 'start')} title="Start">
                    <Play size={12} />
                  </button>
                )}
                {robot.status === 'running' && (
                  <button className="btn-sm btn-secondary" onClick={() => handleAction(robot._id, 'pause')} title="Pause">
                    <Pause size={12} />
                  </button>
                )}
                {robot.status !== 'stopped' && (
                  <button className="btn-sm btn-danger" onClick={() => handleAction(robot._id, 'stop')} title="Stop">
                    <Square size={12} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
