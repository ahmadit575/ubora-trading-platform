import { useState, useEffect } from 'react';
import { Wallet, Lock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import UboraStakingABI from '../lib/UboraStakingABI.json';
import api from '../lib/api';

// BSC Mainnet specific addresses
const STAKING_CONTRACT_ADDRESS = "0xCa0E6c8ab6DE7dc472357d8283Eb77110AE4cF4d"; 
const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const ERC20_ABI = ["function approve(address spender, uint256 amount) public returns (bool)"];

export default function StakingPage() {
  const { address, balance, connectWallet, isConnecting, error } = useWallet();
  const [positions, setPositions] = useState([]);
  const [isStaking, setIsStaking] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [stakeForm, setStakeForm] = useState({
    amount: '',
    platform: 'uborastaking',
    apy: '10'
  });

  const fetchPositions = async () => {
    if (!address) return;
    try {
      const { data } = await api.get('/staking');
      setPositions(data.data.positions);
    } catch (err) {
      console.error('Failed to fetch positions:', err);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, [address]);

  const handleStake = async (e) => {
    debugger
    e.preventDefault();
    setSubmitError(null);
    setIsStaking(true);
    try {
      if (!STAKING_CONTRACT_ADDRESS || STAKING_CONTRACT_ADDRESS === "0x") {
        throw new Error('Smart contract is not yet deployed.');
      }
      // if (parseFloat(stakeForm.amount) > parseFloat(balance)) {
      //   throw new Error('Insufficient USDT balance');
      // }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const amountWei = parseUnits(stakeForm.amount.toString(), 18);

      // Step 1: Approve USDT
      const usdtContract = new Contract(USDT_ADDRESS, ERC20_ABI, signer);
      const approveTx = await usdtContract.approve(STAKING_CONTRACT_ADDRESS, amountWei);
      await approveTx.wait();

      // Step 2: Stake
      const durationMap = { "10": 30, "15": 90, "25": 180, "40": 365 };
      const durationDays = durationMap[stakeForm.apy] || 30;

      const stakingContract = new Contract(STAKING_CONTRACT_ADDRESS, UboraStakingABI.abi, signer);
      const stakeTx = await stakingContract.stake(amountWei, durationDays);
      await stakeTx.wait();

      // Save to backend
      await api.post('/staking', {
        amount: parseFloat(stakeForm.amount),
        platform: stakeForm.platform,
        apy: parseFloat(stakeForm.apy),
        transactionHash: stakeTx.hash
      });

      setStakeForm({ ...stakeForm, amount: '' });
      fetchPositions();
    } catch (err) {
      console.error(err);
      setSubmitError(err.response?.data?.message || err.message || 'Transaction failed');
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (id, indexOnChain) => {
    if (!window.confirm('Are you sure you want to unstake? This action requires a blockchain transaction.')) return;

    setIsStaking(true);
    try {
      if (!STAKING_CONTRACT_ADDRESS || STAKING_CONTRACT_ADDRESS === "0x") {
        throw new Error('Smart contract is not yet deployed.');
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const stakingContract = new Contract(STAKING_CONTRACT_ADDRESS, UboraStakingABI.abi, signer);

      // We assume indexOnChain is available or passed. 
      // For simplicity in this UI, if we don't have the exact index, we'll try to find it,
      // but in a production app, the backend should save the "stakeIndex" from the event.
      // For now, let's assume indexOnChain is passed or we just pass 0 for demo purposes.
      const unstakeTx = await stakingContract.unstake(indexOnChain !== undefined ? indexOnChain : 0);
      await unstakeTx.wait();

      await api.post(`/staking/${id}/unstake`, { transactionHash: unstakeTx.hash });
      fetchPositions();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to unstake. The lock period may not be over yet.');
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Wallet size={24} style={{ color: '#10b981' }} />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>BSC Staking</h1>
      </div>

      {/* Connect Wallet CTA or Connected State */}
      {!address ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '60px 40px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05))' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #10b981, #059669)', marginBottom: '24px', boxShadow: '0 8px 32px rgba(16,185,129,0.3)' }}>
            <Wallet size={36} color="#fff" />
          </div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '12px' }}>Connect Your Wallet</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto 28px' }}>
            Connect your MetaMask or WalletConnect wallet to view staking positions and USDT production on BNB Smart Chain.
          </p>
          {error && <p style={{ color: '#f43f5e', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>}
          <button className="btn-primary" style={{ padding: '14px 32px', fontSize: '1rem' }} onClick={connectWallet} disabled={isConnecting}>
            <Wallet size={18} /> {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '30px 40px', background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(59,130,246,0.05))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={18} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>Wallet Connected</span>
            </div>
            <div style={{ fontSize: '1.2rem', fontFamily: 'monospace', color: '#f1f5f9', fontWeight: 600 }}>
              {address.substring(0, 6)}...{address.substring(address.length - 4)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>USDT Balance</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
              ${parseFloat(balance).toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Staking Dashboard (Visible only when connected) */}
      {address && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            {/* New Stake Form */}
            <div className="glass-card">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '16px' }}>New Stake</h3>
              {submitError && <div style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{submitError}</div>}
              <form onSubmit={handleStake} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', display: 'block' }}>Amount (USDT)</label>
                  <input className="input-field" type="number" min="0.1" step="0.01" value={stakeForm.amount} onChange={e => setStakeForm(f => ({ ...f, amount: e.target.value }))} placeholder="Min 10 USDT" required disabled={isStaking} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', display: 'block' }}>Platform</label>
                  <select className="input-field" value={stakeForm.platform} onChange={e => setStakeForm(f => ({ ...f, platform: e.target.value }))} disabled={isStaking}>
                    <option value="uborastaking">UboraStaking</option>
                    <option value="gbaty">Gbaty</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '6px', display: 'block' }}>Lock Period & APY</label>
                  <select className="input-field" value={stakeForm.apy} onChange={e => setStakeForm(f => ({ ...f, apy: e.target.value }))} disabled={isStaking}>
                    <option value="10">30 Days @ 10% APY</option>
                    <option value="15">90 Days @ 15% APY</option>
                    <option value="25">180 Days @ 25% APY</option>
                    <option value="40">365 Days @ 40% APY</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary" style={{ justifyContent: 'center', marginTop: '8px' }} disabled={isStaking || !stakeForm.amount}>
                  {isStaking ? 'Processing Transaction...' : 'Approve & Stake'}
                </button>
              </form>
            </div>

            {/* Active Positions Table */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f1f5f9' }}>Active Positions</h3>
              </div>
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {positions.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No active staking positions found.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        {['Platform', 'Amount', 'APY', 'Start Date', 'Status', 'Action'].map(h => (
                          <th key={h} style={{ padding: '14px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map(p => (
                        <tr key={p._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#e2e8f0', textTransform: 'capitalize' }}>{p.platform}</td>
                          <td style={{ padding: '12px 16px', color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>{p.amount} USDT</td>
                          <td style={{ padding: '12px 16px', color: '#f59e0b' }}>{p.apy}%</td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{new Date(p.startDate).toLocaleDateString()}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, background: p.status === 'active' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)', color: p.status === 'active' ? '#10b981' : '#94a3b8' }}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {p.status === 'active' && (
                              <button className="btn-secondary btn-sm" onClick={() => handleUnstake(p._id)} disabled={isStaking}>
                                Unstake
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feature Preview Cards (Visible only when NOT connected) */}
      {!address && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '24px' }}>
          {[
            { icon: Lock, title: 'UboraStaking', desc: 'Stake BEP-20 USDT with configurable APY and lock periods', color: '#8b5cf6' },
            { icon: TrendingUp, title: 'USDT Production', desc: 'Track daily USDT produced from AI trading operations', color: '#3b82f6' },
            { icon: Wallet, title: 'Gbaty', desc: 'Secondary staking platform with cross-chain support', color: '#10b981' },
          ].map(card => (
            <div key={card.title} className="glass-card" style={{ opacity: 0.6 }}>
              <card.icon size={24} style={{ color: card.color, marginBottom: '12px' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '8px' }}>{card.title}</h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>{card.desc}</p>
              <div style={{ marginTop: '16px', fontSize: '0.75rem', color: '#475569', fontWeight: 600, textTransform: 'uppercase' }}>Available after connect</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
