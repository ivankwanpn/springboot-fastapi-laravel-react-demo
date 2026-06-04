'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';

interface Transaction {
  id: number;
  fromWalletId: number | null;
  toWalletId: number | null;
  amount: number;
  txType: string;
  status: string;
  createdAt: string;
  fromUsername: string | null;
  toUsername: string | null;
}

interface TransactionTableProps {
  transactions: Transaction[];
  username: string;
  fromDate: string;
  toDate: string;
  page: number;
  totalPages: number;
  total: number;
}

export default function TransactionTable({
  transactions,
  username: initialUsername,
  fromDate: initialFrom,
  toDate: initialTo,
  page,
  totalPages,
  total,
}: TransactionTableProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (username.trim()) params.set('username', username.trim());
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    params.set('page', '1');
    router.push(`/admin/transactions?${params.toString()}`);
  };

  const handleClear = () => {
    setUsername('');
    setFromDate('');
    setToDate('');
    router.push('/admin/transactions');
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    if (username.trim()) params.set('username', username.trim());
    if (fromDate) params.set('from', fromDate);
    if (toDate) params.set('to', toDate);
    params.set('page', String(newPage));
    router.push(`/admin/transactions?${params.toString()}`);
  };

  const hasFilters = username.trim() || fromDate || toDate;

  return (
    <div>
      {/* Filters */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <Input
            label="Username"
            type="text"
            placeholder="Search by username..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            label="From"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </div>
        <div className="w-40">
          <Input
            label="To"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {hasFilters && (
            <Button type="button" variant="ghost" onClick={handleClear}>
              Clear
            </Button>
          )}
        </div>
      </form>

      {/* Table */}
      <Card padding="none">
        {transactions.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description="No transactions match your filter criteria."
          />
        ) : (
          <div className="divide-y divide-navy-600">
            {/* Header */}
            <div className="grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium uppercase tracking-wider text-navy-400">
              <div className="col-span-1">ID</div>
              <div className="col-span-2">From</div>
              <div className="col-span-2">To</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-1">Type</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="grid grid-cols-12 gap-3 px-5 py-3 items-center text-sm"
              >
                <div className="col-span-1 text-navy-400">{tx.id}</div>
                <div className="col-span-2 text-white truncate">
                  {tx.fromUsername || 'System'}
                </div>
                <div className="col-span-2 text-white truncate">
                  {tx.toUsername || 'System'}
                </div>
                <div className="col-span-2 text-right font-medium text-white">
                  {tx.amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </div>
                <div className="col-span-2 text-navy-300">
                  {new Date(tx.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className="col-span-1">
                  <span className="text-navy-300">{tx.txType}</span>
                </div>
                <div className="col-span-2 text-right">
                  <Badge
                    variant={tx.status === 'SUCCESS' ? 'success' : 'danger'}
                  >
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-navy-400">
            Page {page} of {totalPages} ({total} total transactions)
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
