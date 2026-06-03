import { useState, useEffect, useCallback } from 'react';
import Card from '../../components/ui/Card';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import BarChart from '../../components/charts/BarChart';
import { listTransactions, getTransactionStats } from '../../services/adminService';
import type { AdminTransaction, TransactionStats } from '../../types';

const PAGE_SIZE = 20;

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function TransactionMonitoringPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [fromDate, setFromDate] = useState(daysAgo(30));
  const [toDate, setToDate] = useState(today());

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      listTransactions(username, fromDate, toDate, page, PAGE_SIZE),
      getTransactionStats(fromDate, toDate),
    ])
      .then(([txRes, statsRes]) => {
        setTransactions(txRes.data);
        setTotal(txRes.total);
        setStats(statsRes);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [username, fromDate, toDate, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dailyAvg = stats && stats.dailyVolume.length > 0
    ? stats.dailyVolume.reduce((s, d) => s + d.count, 0) / stats.dailyVolume.length
    : 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-1">Transaction Monitoring</h1>
      <p className="text-sm text-navy-300 mb-6">Monitor all transactions across the platform</p>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-1">Total Transactions</p>
            <p className="text-lg font-mono font-semibold text-white">{stats.totalTransactions.toLocaleString()}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-1">Total Volume</p>
            <p className="text-lg font-mono font-semibold text-emerald-400">{parseFloat(stats.totalAmount).toFixed(4)} USDT</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-1">Daily Average</p>
            <p className="text-lg font-mono font-semibold text-amber-400">{dailyAvg.toFixed(1)} tx/day</p>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="w-48">
          <Input
            placeholder="Filter by username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="rounded-lg border border-navy-500 bg-navy-700 px-3 py-2 text-sm text-white"
        />
        <span className="text-navy-400 self-center">to</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="rounded-lg border border-navy-500 bg-navy-700 px-3 py-2 text-sm text-white"
        />
        <Button variant="secondary" onClick={() => { setPage(1); fetchData(); }}>Search</Button>
      </div>

      {loading && <Spinner className="h-10 w-10" />}

      {error && (
        <Card>
          <div className="text-center py-12"><p className="text-red-400 text-sm">{error}</p></div>
        </Card>
      )}

      {!loading && !error && transactions.length === 0 && (
        <Card>
          <EmptyState icon="history" title="No transactions found" description="No transactions match your filters." />
        </Card>
      )}

      {/* Daily Volume Chart */}
      {stats && stats.dailyVolume.length > 0 && (
        <Card className="mb-6">
          <p className="text-xs font-medium text-navy-300 uppercase tracking-wide mb-3">Daily Transaction Volume</p>
          <BarChart
            data={stats.dailyVolume.map((d) => ({ label: d.date, value: d.count }))}
            height={200}
          />
        </Card>
      )}

      {/* Transaction Table */}
      {!loading && transactions.length > 0 && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-navy-600">
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">ID</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">From</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">To</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-navy-300 uppercase tracking-wider">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-navy-300 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-navy-600 last:border-0 hover:bg-navy-700/50 transition-colors">
                    <td className="px-5 py-4"><span className="text-xs text-navy-400 font-mono">#{tx.id}</span></td>
                    <td className="px-5 py-4"><span className="text-sm text-white">{tx.fromUsername ?? `Wallet #${tx.fromWalletId}`}</span></td>
                    <td className="px-5 py-4"><span className="text-sm text-white">{tx.toUsername ?? `Wallet #${tx.toWalletId}`}</span></td>
                    <td className="px-5 py-4 text-right"><span className="font-mono text-sm font-medium text-emerald-400">{parseFloat(tx.amount).toFixed(4)} USDT</span></td>
                    <td className="px-5 py-4"><span className="text-sm text-navy-200">{tx.txType}</span></td>
                    <td className="px-5 py-4"><Badge variant={tx.status === 'SUCCESS' ? 'success' : 'warning'}>{tx.status}</Badge></td>
                    <td className="px-5 py-4"><span className="text-sm text-navy-200">{formatDate(tx.createdAt)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-navy-600 px-5 py-3 flex items-center justify-between">
            <p className="text-xs text-navy-300">Page {page} of {totalPages} ({total} transactions)</p>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
