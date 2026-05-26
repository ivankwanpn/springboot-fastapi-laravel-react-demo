import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTransactionHistory } from '../services/transactionService';
import Card from '../components/ui/Card';
import Spinner from '../components/ui/Spinner';
import { getWallet } from '../services/walletService';
import EmptyState from '../components/ui/EmptyState';
import Badge from '../components/ui/Badge';
import type { Transaction, Wallet } from '../types';

type Filter = 'all' | 'sent' | 'received';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(dateStr));
}

export default function TransactionHistoryPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

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
        setTransactions(txs);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load transactions'),
      )
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = transactions.filter((tx) => {
    if (!wallet) return true;
    if (filter === 'sent') return tx.fromWalletId === wallet.id;
    if (filter === 'received') return tx.toWalletId === wallet.id;
    return true;
  });

  const totalSent = transactions
    .filter((tx) => wallet && tx.fromWalletId === wallet.id)
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const totalReceived = transactions
    .filter((tx) => wallet && tx.toWalletId === wallet.id)
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  if (loading) return <Spinner className="h-10 w-10" />;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-1">Transaction History</h1>
      <p className="text-sm text-navy-300 mb-6">
        A complete record of all your transfers
      </p>

      {/* Stats */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-1">
              Total Sent
            </p>
            <p className="text-lg font-mono font-semibold text-amber-400">
              -{totalSent.toFixed(2)} USDT
            </p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-1">
              Total Received
            </p>
            <p className="text-lg font-mono font-semibold text-emerald-400">
              +{totalReceived.toFixed(2)} USDT
            </p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {([
          ['all', 'All'],
          ['sent', 'Sent'],
          ['received', 'Received'],
        ] as const).map(([f, label]) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-navy-750 text-navy-300 border border-navy-600 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Card>
          <div className="text-center py-12">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!error && filtered.length === 0 && (
        <Card>
          <EmptyState
            icon="history"
            title={
              transactions.length === 0
                ? 'No transactions yet'
                : 'No matching transactions'
            }
            description={
              transactions.length === 0
                ? 'Your transaction history will appear here once you start sending or receiving USDT.'
                : 'Try changing the filter to see more transactions.'
            }
          />
        </Card>
      )}

      {/* Transaction Table */}
      {filtered.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-600">
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">
                    TX ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => {
                  const isIncoming = wallet ? tx.toWalletId === wallet.id : false;
                  return (
                    <tr
                      key={tx.id}
                      className="border-b border-navy-600 last:border-0 hover:bg-navy-700/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full ${
                              isIncoming
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {isIncoming ? (
                                <path d="M7 17l9.2-9.2M17 17V7H7" />
                              ) : (
                                <path d="M17 7l-9.2 9.2M7 7v10h10" />
                              )}
                            </svg>
                          </div>
                          <span className="text-sm text-white font-medium">
                            {isIncoming ? 'Received' : 'Sent'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`font-mono text-sm font-medium ${
                            isIncoming ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {isIncoming ? '+' : '-'}
                          {parseFloat(tx.amount).toFixed(4)} USDT
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant={tx.status === 'SUCCESS' ? 'success' : 'warning'}
                        >
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm text-navy-200">
                          {formatDate(tx.createdAt)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-navy-400 font-mono">
                          #{tx.id}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-navy-600 px-5 py-3">
            <p className="text-xs text-navy-300">
              Showing {filtered.length} of {transactions.length} transaction
              {transactions.length !== 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
