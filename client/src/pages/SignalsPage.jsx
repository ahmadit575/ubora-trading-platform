import { useEffect, useState } from 'react';
import { Signal, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../lib/api';

export default function SignalsPage() {
  const [signals, setSignals] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ pair: '', strategy: '', status: '', page: 1 });

  const fetchSignals = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.pair) params.set('pair', filters.pair);
      if (filters.strategy) params.set('strategy', filters.strategy);
      if (filters.status) params.set('status', filters.status);
      params.set('page', filters.page);
      params.set('limit', '20');
      const { data } = await api.get(`/signals?${params}`);
      setSignals(data.data.signals);
      setPagination(data.data.pagination);
    } catch {}
  };

  useEffect(() => { fetchSignals(); }, [filters]);

  const confidence = (score) => {
    const cls = score >= 80 ? 'confidence-high' : score >= 60 ? 'confidence-medium' : 'confidence-low';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '30px' }}>{score}%</span>
        <div className="confidence-bar" style={{ width: '80px' }}>
          <div className={`confidence-fill ${cls}`} style={{ width: `${score}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Signal size={24} style={{ color: '#3b82f6' }} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>Signal History</h1>
        </div>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>{pagination.total} signals</span>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={16} style={{ color: '#64748b' }} />
        <input className="input-field" style={{ width: '160px' }} placeholder="Pair (e.g. BTC/USDT)" value={filters.pair} onChange={(e) => setFilters(f => ({ ...f, pair: e.target.value, page: 1 }))} />
        <select className="input-field" style={{ width: '140px' }} value={filters.strategy} onChange={(e) => setFilters(f => ({ ...f, strategy: e.target.value, page: 1 }))}>
          <option value="">All Strategies</option>
          <option value="scalping">Scalping</option>
          <option value="daily">Daily</option>
        </select>
        <select className="input-field" style={{ width: '140px' }} value={filters.status} onChange={(e) => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Pair', 'Direction', 'Strategy', 'Entry Zone', 'SL', 'TP', 'Confidence', 'Status', 'Time (GMT)'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s) => (
                <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#e2e8f0' }}>{s.pair}</td>
                  <td style={{ padding: '12px 16px' }}><span className={s.direction === 'BUY' ? 'badge-buy' : 'badge-sell'}>{s.direction}</span></td>
                  <td style={{ padding: '12px 16px' }}><span className={s.strategy === 'scalping' ? 'pill-scalping' : 'pill-daily'}>{s.strategy}</span></td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#cbd5e1', fontSize: '0.8rem' }}>{s.entryZone?.min?.toFixed(5)} – {s.entryZone?.max?.toFixed(5)}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#f43f5e' }}>{s.stopLoss?.toFixed(5)}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#10b981' }}>{s.takeProfit?.toFixed(5)}</td>
                  <td style={{ padding: '12px 16px' }}>{confidence(s.confidenceScore)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: s.status === 'active' ? 'rgba(16,185,129,0.1)' : s.status === 'closed' ? 'rgba(100,116,139,0.1)' : 'rgba(59,130,246,0.1)', color: s.status === 'active' ? '#10b981' : s.status === 'closed' ? '#94a3b8' : '#3b82f6' }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#64748b', fontSize: '0.8rem' }}>{new Date(s.gmtTimestamp).toISOString().substring(0, 19).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button className="btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}><ChevronLeft size={14} /></button>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Page {pagination.page} of {pagination.pages}</span>
          <button className="btn-secondary btn-sm" disabled={filters.page >= pagination.pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}><ChevronRight size={14} /></button>
        </div>
      </div>
    </div>
  );
}
