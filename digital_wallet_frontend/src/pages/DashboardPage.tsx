import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/walletService';
import { getTransactionHistory } from '../services/transactionService';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import type { Wallet, Transaction } from '../types';

function formatBalance(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount) + ` ${currency}`;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr));
}

function TransactionRow({ tx, walletId }: { tx: Transaction; walletId: number }) {
  const isIncoming = tx.toWalletId === walletId;

  return (
    <div className="flex items-center justify-between py-3 border-b border-navy-600 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-full ${
            isIncoming ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isIncoming ? (
              <path d="M7 17l9.2-9.2M17 17V7H7" />
            ) : (
              <path d="M17 7l-9.2 9.2M7 7v10h10" />
            )}
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-white">
            {isIncoming ? 'Received' : 'Sent'} USDT
          </p>
          <p className="text-xs text-navy-300">{formatDate(tx.createdAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p
          className={`text-sm font-mono font-medium ${
            isIncoming ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {isIncoming ? '+' : '-'}{parseFloat(tx.amount).toFixed(2)} USDT
        </p>
        <Badge variant={tx.status === 'SUCCESS' ? 'success' : 'warning'}>
          {tx.status}
        </Badge>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      getWallet(),
      getTransactionHistory(),
    ])
      .then(([w, txs]) => {
        setWallet(w);
        setTransactions(txs.slice(0, 5));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <Spinner className="h-10 w-10" />;

  if (error) {
    return (
      <div className="p-8">
        <Card>
          <div className="text-center py-12">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-6">
        Welcome back{user?.username ? `, ${user.username}` : ''}
      </h1>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-navy-750 via-navy-750 to-emerald-900/30 border border-navy-600 p-6 mb-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-navy-200">Total Balance</p>
            <div className="flex items-center gap-1.5 rounded-lg bg-navy-800/50 px-2.5 py-1 text-xs text-emerald-400 font-medium border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </div>
          </div>
          <p className="text-4xl font-mono font-bold text-white tracking-tight">
            {wallet ? formatBalance(wallet.balance, wallet.currency) : '0.00 USDT'}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-navy-300">
              Wallet #{wallet?.id ?? '—'}
            </span>
            <span className="text-navy-500">•</span>
            <span className="text-xs text-navy-300">
              v{wallet?.version ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Link
          to="/transfer"
          className="flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 p-4 hover:border-emerald-500/30 hover:bg-navy-700 transition-all group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 1l4 4-4 4" />
              <path d="M3 11V9a4 4 0 014-4h14" />
              <path d="M7 23l-4-4 4-4" />
              <path d="M21 13v2a4 4 0 01-4 4H3" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Send USDT</p>
            <p className="text-xs text-navy-300">Transfer to others</p>
          </div>
        </Link>
        <Link
          to="/transactions"
          className="flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 p-4 hover:border-emerald-500/30 hover:bg-navy-700 transition-all group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20a8 8 0 100-16 8 8 0 000 16z" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">History</p>
            <p className="text-xs text-navy-300">View all transactions</p>
          </div>
        </Link>
        <div className="flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 p-4 opacity-50 cursor-not-allowed">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-500/20 text-navy-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-white">Analytics</p>
            <p className="text-xs text-navy-300">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-base font-semibold text-white">Recent Transactions</h2>
          <Link to="/transactions" className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium">
            View all
          </Link>
        </div>
        {transactions.length === 0 ? (
          <EmptyState
            icon="history"
            title="No transactions yet"
            description="Your transaction history will appear here once you start sending or receiving USDT."
          />
        ) : (
          <div className="mt-2">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} walletId={wallet!.id} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
