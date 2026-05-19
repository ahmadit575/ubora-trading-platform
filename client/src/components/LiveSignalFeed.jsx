import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { Zap } from 'lucide-react';
import api from '../lib/api';

function SignalCard({ signal, index }) {
  const confidence = signal.confidenceScore;
  const barClass = confidence >= 80 ? 'confidence-high' : confidence >= 60 ? 'confidence-medium' : 'confidence-low';
  
  const duration = signal.strategy === 'scalping' ? '1 Min' : '1 Day';
  const ts = new Date(signal.gmtTimestamp);
  const entryTime = new Date(ts.getTime() - 2 * 60 * 1000);
  const durationMs = signal.strategy === 'scalping' ? 1 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const exitTime = new Date(entryTime.getTime() + durationMs);

  const formatTime = (d) => d.toISOString().substring(11, 19) + ' GMT';

  return (
    <div className="glass-card-sm animate-fade-in" style={{ animationDelay: `${index * 60}ms` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f1f5f9' }}>{signal.pair}</span>
          <span className={signal.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}>{signal.direction}</span>
          <span className={signal.strategy === 'scalping' ? 'pill-scalping' : 'pill-daily'}>{signal.strategy}</span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#cbd5e1', fontWeight: 600 }}>Dur: {duration}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Entry Zone</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', fontFamily: 'monospace' }}>
            {signal.entryZone?.min?.toFixed(5)} - {signal.entryZone?.max?.toFixed(5)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Entry Time</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace' }}>{formatTime(entryTime)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Exit Time</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', fontFamily: 'monospace' }}>{formatTime(exitTime)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Stop Loss</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f43f5e', fontFamily: 'monospace' }}>{signal.stopLoss?.toFixed(5)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Take Profit</div>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981', fontFamily: 'monospace' }}>{signal.takeProfit?.toFixed(5)}</div>
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>Confidence</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '20px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{confidence}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LiveSignalFeed({ limit = 20 }) {
  const [signals, setSignals] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get(`/signals?limit=${limit}&status=pending,active`);
        setSignals(data.data.signals);
      } catch {}
    };
    load();
  }, [limit]);

  useEffect(() => {
    if (!socket) return;
    const handleNew = (signal) => {
      setSignals(prev => [signal, ...prev].slice(0, limit));
    };
    const handleUpdate = (signal) => {
      setSignals(prev => prev.map(s => s._id === signal._id ? signal : s));
    };
    socket.on('signal:new', handleNew);
    socket.on('signal:update', handleUpdate);
    socket.on('signal:closed', handleUpdate);
    return () => {
      socket.off('signal:new', handleNew);
      socket.off('signal:update', handleUpdate);
      socket.off('signal:closed', handleUpdate);
    };
  }, [socket, limit]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <Zap size={18} style={{ color: '#f59e0b' }} />
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Live Signal Feed</h2>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', animation: 'pulse-green 2s infinite' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
        {signals.length === 0 ? (
          <div className="glass-card-sm" style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
            No active signals. Waiting for AI engine...
          </div>
        ) : (
          signals.map((signal, i) => <SignalCard key={signal._id} signal={signal} index={i} />)
        )}
      </div>
    </div>
  );
}
