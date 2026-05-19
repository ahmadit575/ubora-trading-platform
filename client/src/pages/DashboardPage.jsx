import MarketSessionClock from '../components/MarketSessionClock';
import PnLSummary from '../components/PnLSummary';
import LiveSignalFeed from '../components/LiveSignalFeed';
import RobotStatusBar from '../components/RobotStatusBar';

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <style>{`
        .dashboard-grid {
          display: grid;
          grid-template-columns: 1fr 360px;
          gap: 20px;
        }
        @media (max-width: 992px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Top bar: Market clock */}
      <MarketSessionClock />

      {/* Metric cards */}
      <PnLSummary />

      {/* Main content: signals + robots */}
      <div className="dashboard-grid">
        <LiveSignalFeed />
        <RobotStatusBar />
      </div>
    </div>
  );
}
