import { createContext, useContext, useState, useEffect } from 'react';
import { BrowserProvider, formatUnits, Contract } from 'ethers';
import api from '../lib/api';

const WalletContext = createContext(null);

const BSC_CHAIN_ID = '0x38'; // 56 in hex
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'; // BSC USDT

export function WalletProvider({ children }) {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState('0');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      // Check network
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== BSC_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: BSC_CHAIN_ID }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: BSC_CHAIN_ID,
                chainName: 'BNB Smart Chain Mainnet',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      setAddress(account);
      
      // Get USDT Balance
      await updateBalance(account);
      
      // Update user profile in backend
      await api.patch('/auth/me/wallet', { walletAddress: account });

    } catch (err) {
      console.error('Wallet connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const updateBalance = async (acc) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      // Minimal ABI for ERC20 balance
      const abi = ["function balanceOf(address owner) view returns (uint256)"];
      const contract = new Contract(USDT_ADDRESS, abi, provider);
      const bal = await contract.balanceOf(acc);
      setBalance(formatUnits(bal, 18));
    } catch (err) {
      console.error('Balance update failed:', err);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          updateBalance(accounts[0]);
        } else {
          setAddress(null);
          setBalance('0');
        }
      });
      
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <WalletContext.Provider value={{ address, balance, isConnecting, error, connectWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be inside WalletProvider');
  return ctx;
};
