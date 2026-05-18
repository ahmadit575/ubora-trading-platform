import { useEffect, useState } from 'react';
import { TrendingUp, Trophy, Signal, Bot } from 'lucide-react';
import api from '../lib/api';

export default function PnLSummary() {
  const [stats, setStats] = useState({ todayPnL: 0, winRate: 0, totalSignals: 0, closedSignals: 0 });
  const [robotCount, setRobotCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [signalRes, robotRes] = await Promise.all([
          api.get('/signals/stats/today'),
          api.get('/robots'),
        ]);
        setStats(signalRes.data.data);
        const active = robotRes.data.data.robots.filter(r => r.status === 'running').length;
        setRobotCount(active);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  const cards = [
    {
      label: "Today's P&L",
      value: `${stats.todayPnL >= 0 ? '+' : ''}${stats.todayPnL.toFixed(2)} USDT`,
      icon: TrendingUp,
      color: stats.todayPnL >= 0 ? '#10b981' : '#f43f5e',
      gradient: stats.todayPnL >= 0
        ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))'
        : 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(244,63,94,0.05))',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate}%`,
      icon: Trophy,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
    },
    {
      label: 'Signals Today',
      value: stats.totalSignals,
      icon: Signal,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05))',
    },
    {
      label: 'Active Robots',
      value: robotCount,
      icon: Bot,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      {cards.map((card) => (
        <div key={card.label} className="glass-card animate-fade-in" style={{ background: card.gradient, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>{card.label}</span>
            <card.icon size={20} style={{ color: card.color }} />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: card.color }}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
