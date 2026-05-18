import MarketSessionClock from '../components/MarketSessionClock';
import PnLSummary from '../components/PnLSummary';
import LiveSignalFeed from '../components/LiveSignalFeed';
import RobotStatusBar from '../components/RobotStatusBar';

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top bar: Market clock */}
      <MarketSessionClock />

      {/* Metric cards */}
      <PnLSummary />

      {/* Main content: signals + robots */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px' }}>
        <LiveSignalFeed />
        <RobotStatusBar />
      </div>
    </div>
  );
}
