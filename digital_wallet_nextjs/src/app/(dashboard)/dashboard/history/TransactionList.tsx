'use client';

import { useState, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

type FilterType = 'all' | 'sent' | 'received';

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

interface TransactionListProps {
  transactions: Transaction[];
  walletId: number;
  currency: string;
}

const filterTabs: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sent', label: 'Sent' },
  { key: 'received', label: 'Received' },
];

export default function TransactionList({
  transactions,
  walletId,
  currency,
}: TransactionListProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredTransactions = useMemo(() => {
    if (filter === 'sent') {
      return transactions.filter((tx) => tx.fromWalletId === walletId);
    }
    if (filter === 'received') {
      return transactions.filter((tx) => tx.toWalletId === walletId);
    }
    return transactions;
  }, [transactions, filter, walletId]);

  return (
    <>
      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-navy-400 hover:text-white hover:bg-navy-700 border border-navy-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transactions */}
      <Card padding="none">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            title={
              filter === 'sent'
                ? 'No sent transactions'
                : filter === 'received'
                ? 'No received transactions'
                : 'No transactions yet'
            }
            description={
              filter === 'all'
                ? 'Your transaction history will appear here once you make your first transfer.'
                : `No ${filter} transactions found.`
            }
          />
        ) : (
          <div className="divide-y divide-navy-600">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-medium uppercase tracking-wider text-navy-400">
              <div className="col-span-2">Type</div>
              <div className="col-span-4">Counterparty</div>
              <div className="col-span-2 text-right">Amount</div>
              <div className="col-span-2 text-right">Date</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {filteredTransactions.map((tx) => {
              const isOutgoing = tx.fromWalletId === walletId;
              const counterparty = isOutgoing
                ? tx.toUsername
                : tx.fromUsername;

              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-12 gap-4 px-5 py-4 items-center"
                >
                  {/* Type */}
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                        isOutgoing ? 'text-red-400' : 'text-emerald-400'
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
                        {isOutgoing ? (
                          <path d="M17 1l4 4-4 4" />
                        ) : (
                          <path d="M7 23l-4-4 4-4" />
                        )}
                        <path
                          d={
                            isOutgoing
                              ? 'M3 11V9a4 4 0 014-4h14'
                              : 'M21 13v2a4 4 0 01-4 4H3'
                          }
                        />
                      </svg>
                      {isOutgoing ? 'Sent' : 'Received'}
                    </span>
                  </div>

                  {/* Counterparty */}
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-white">
                      {counterparty || 'Unknown'}
                    </p>
                    <p className="text-xs text-navy-400">{tx.txType}</p>
                  </div>

                  {/* Amount */}
                  <div className="col-span-2 text-right">
                    <span
                      className={`text-sm font-semibold ${
                        isOutgoing ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {isOutgoing ? '-' : '+'}
                      {tx.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}{' '}
                      <span className="text-xs font-normal">{currency}</span>
                    </span>
                  </div>

                  {/* Date */}
                  <div className="col-span-2 text-right text-sm text-navy-300">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>

                  {/* Status */}
                  <div className="col-span-2 text-right">
                    <Badge
                      variant={tx.status === 'SUCCESS' ? 'success' : 'danger'}
                    >
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Summary */}
      {filteredTransactions.length > 0 && (
        <p className="mt-4 text-xs text-navy-400 text-right">
          Showing {filteredTransactions.length} of {transactions.length}{' '}
          transaction{transactions.length !== 1 ? 's' : ''}
        </p>
      )}
    </>
  );
}
