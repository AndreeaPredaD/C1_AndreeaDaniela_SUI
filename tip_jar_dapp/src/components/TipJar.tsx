'use client';

import { useState, useEffect } from 'react';
import { useSuiClient, useCurrentAccount } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { useSponsoredTransaction } from '@/hooks/useSponsoredTransaction';

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID || '0x0';
const TIP_JAR_ID = process.env.NEXT_PUBLIC_TIP_JAR_ID || '0x0';

interface TipJarStats {
  owner: string;
  totalTips: string;
  tipCount: string;
}

interface TipJarProps {
  refreshKey?: number;
  onTipSuccess?: () => void;
}

export function TipJar({ refreshKey = 0, onTipSuccess }: TipJarProps) {
  const [tipAmount, setTipAmount] = useState('');
  const [tipJarStats, setTipJarStats] = useState<TipJarStats | null>(null);
  const [newOwner, setNewOwner] = useState('');
  const [loading, setLoading] = useState(false);

  const { executeSponsoredTransaction, isLoading } = useSponsoredTransaction();
  const client = useSuiClient();
  const currentAccount = useCurrentAccount();

  const fetchTipJarStats = async () => {
    if (!TIP_JAR_ID || TIP_JAR_ID === '0x0') return;
    try {
      const tipJarObject = await client.getObject({
        id: TIP_JAR_ID,
        options: { showContent: true },
      });

      if (tipJarObject.data?.content && 'fields' in tipJarObject.data.content) {
        const fields = tipJarObject.data.content.fields as Record<string, unknown>;
        setTipJarStats({
          owner: String(fields.owner || ''),
          totalTips: String(fields.total_tips_received || '0'),
          tipCount: String(fields.tip_count || '0'),
        });
      }
    } catch (error) {
      console.error('Error fetching tip jar stats:', error);
    }
  };

  useEffect(() => {
    fetchTipJarStats();
  }, [client, refreshKey]);

  // --- Helper: format address for Move call ---
  const formatSuiAddress = (address: string): string => {
    if (!address.startsWith('0x')) address = '0x' + address;
    address = address.toLowerCase();
    const addrWithoutPrefix = address.slice(2);
    const padded = addrWithoutPrefix.padStart(64, '0');
    return '0x' + padded;
  };

  // --- Send Tip ---
  const sendTip = async () => {
    if (!currentAccount || !tipAmount || !PACKAGE_ID || !TIP_JAR_ID) return;
    setLoading(true);
    try {
      const tipInMist = Math.floor(parseFloat(tipAmount) * 1_000_000_000);
      if (tipInMist <= 0) return alert('Enter a valid tip amount');

      const coins = await client.getCoins({ owner: currentAccount.address, coinType: '0x2::sui::SUI' });
      if (!coins.data.length) return alert('No SUI coins found');

      let selectedCoin = coins.data[0];
      for (const coin of coins.data) {
        if (parseInt(coin.balance) >= tipInMist) {
          selectedCoin = coin;
          break;
        }
        if (parseInt(coin.balance) > parseInt(selectedCoin.balance)) selectedCoin = coin;
      }
      if (parseInt(selectedCoin.balance) < tipInMist) return alert('Insufficient balance');

      const tx = new Transaction();
      const [tipCoin] = tx.splitCoins(tx.object(selectedCoin.coinObjectId), [tipInMist]);
      tx.moveCall({
        target: `${PACKAGE_ID}::tip_jar_contract::send_tip`,
        arguments: [tx.object(TIP_JAR_ID), tipCoin],
      });

      await executeSponsoredTransaction(tx, {
        onSuccess: () => {
          alert(`Tip of ${tipAmount} SUI sent successfully!`);
          setTipAmount('');
          onTipSuccess?.();
          fetchTipJarStats();
        },
        onError: (err) => alert('Error sending tip: ' + String(err)),
      });
    } catch (err) {
      console.error(err);
      alert('Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  // --- Reset Stats ---
  const resetStats = async () => {
    if (!currentAccount) return;
    setLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::tip_jar_contract::reset_stats`,
        arguments: [tx.object(TIP_JAR_ID)],
      });

      await executeSponsoredTransaction(tx, {
        onSuccess: () => {
          alert('Tip jar stats reset successfully!');
          fetchTipJarStats();
        },
        onError: (err) => alert('Error resetting stats: ' + String(err)),
      });
    } catch (err) {
      console.error(err);
      alert('Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  // --- Change Owner ---
  const handleChangeOwner = async () => {
    if (!currentAccount || !newOwner) return;
    setLoading(true);
    try {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::tip_jar_contract::change_owner`,
        arguments: [tx.object(TIP_JAR_ID), tx.pure(newOwner as any, 'address' as any)],
      });

      await executeSponsoredTransaction(tx, {
        onSuccess: () => {
          alert('Owner changed successfully!');
          setNewOwner('');
          fetchTipJarStats();
        },
        onError: (err) => alert('Error changing owner: ' + String(err)),
      });
    } catch (err) {
      console.error(err);
      alert('Error creating transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Simple Tip Jar</h2>
        <p className="text-gray-600">Please connect your wallet to send tips.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Simple Tip Jar</h2>

      {/* Tip Jar Stats */}
      {tipJarStats && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Statistics</h3>
          <p>Total Tips: {(parseInt(tipJarStats.totalTips) / 1_000_000_000).toFixed(3)} SUI</p>
          <p>Tip Count: {tipJarStats.tipCount}</p>
          <p className="break-all text-xs">Owner: {tipJarStats.owner}</p>
        </div>
      )}

      {/* Send Tip */}
      <div className="space-y-2">
        <input
          type="number"
          placeholder="Tip Amount (SUI)"
          value={tipAmount}
          onChange={(e) => setTipAmount(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading || loading}
          step="0.001"
          min="0"
        />
        <button
          onClick={sendTip}
          disabled={isLoading || loading || !tipAmount || parseFloat(tipAmount) <= 0}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Send Tip (Gas-Free)
        </button>
      </div>

      {/* Change Owner */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="New Owner Address"
          value={newOwner}
          onChange={(e) => setNewOwner(e.target.value)}
          className="w-full px-3 py-2 border rounded-md"
          disabled={loading}
        />
        <button
          onClick={handleChangeOwner}
          disabled={loading || !newOwner}
          className="w-full bg-green-500 text-white py-2 rounded hover:bg-green-600"
        >
          Change Owner
        </button>
      </div>

      {/* Reset Stats */}
      <button
        onClick={resetStats}
        disabled={loading}
        className="w-full bg-red-500 text-white py-2 rounded hover:bg-red-600"
      >
        Reset Stats
      </button>
    </div>
  );
}
