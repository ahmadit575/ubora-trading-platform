import { useState, useEffect } from 'react';
import { Clock, Globe, Wifi, WifiOff } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

const SESSIONS = [
  { name: 'London', key: 'london', start: 7, end: 16, className: 'session-london' },
  { name: 'New York', key: 'new_york', start: 12, end: 21, className: 'session-newyork' },
  { name: 'Overlap', key: 'overlap', start: 12, end: 16, className: 'session-overlap' },
];

export default function MarketSessionClock() {
  const [time, setTime] = useState(new Date());
  const { connected } = useSocket();

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hour = time.getUTCHours();
  const day = time.getUTCDay();
  const isWeekday = day > 0 && day < 6;

  const formatGMT = () => {
    return time.toISOString().replace('T', '  ').substring(0, 21) + ' GMT';
  };

  return (
    <div className="glass-card" style={{ padding: '16px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        {/* GMT Clock and Connection Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={20} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9', letterSpacing: '0.05em' }}>
              {formatGMT()}
            </span>
          </div>
          {connected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse-green 2s infinite' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>LIVE</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(244, 63, 94, 0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
              <WifiOff size={12} style={{ color: '#f43f5e' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#f43f5e' }}>RECONNECTING...</span>
            </div>
          )}
        </div>

        {/* Session Indicators */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Globe size={16} style={{ color: '#64748b' }} />
          {SESSIONS.map((session) => {
            const active = isWeekday && hour >= session.start && hour < session.end;
            return (
              <div
                key={session.key}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 14px', borderRadius: '9999px',
                  background: active ? undefined : 'rgba(255,255,255,0.04)',
                  border: active ? 'none' : '1px solid rgba(255,255,255,0.06)',
                  opacity: active ? 1 : 0.4,
                  transition: 'all 0.3s ease',
                }}
                className={active ? session.className : ''}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: active ? '#fff' : '#475569',
                  animation: active ? 'pulse-green 2s infinite' : 'none',
                }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: active ? '#fff' : '#64748b' }}>
                  {session.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
