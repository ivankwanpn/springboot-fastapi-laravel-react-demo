'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

function getCookie(name: string): string | undefined {
  const value = `; ${typeof document !== 'undefined' ? document.cookie : ''}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
}

export default function TransferPage() {
  const [toUsername, setToUsername] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetForm = () => {
    setToUsername('');
    setAmount('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!toUsername.trim()) {
      setError('Recipient username is required');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Show confirmation modal
    setShowConfirm(true);
  };

  const handleConfirmTransfer = async () => {
    setIsLoading(true);
    setError('');

    const token = getCookie('token');

    try {
      const res = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          toUsername: toUsername.trim(),
          amount: parseFloat(amount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Transfer failed');
        setShowConfirm(false);
        return;
      }

      setSuccess(
        `Successfully sent ${parseFloat(amount).toLocaleString()} USDT to ${toUsername.trim()}!`
      );
      setShowConfirm(false);
      resetForm();

      // Clear success after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      setError('Network error. Please try again.');
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="px-6 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Transfer Funds</h1>
        <p className="mt-1 text-sm text-navy-400">
          Send USDT to another user instantly
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          {success}
        </div>
      )}

      {/* Form Card */}
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Recipient Username"
            type="text"
            placeholder="Enter the username to send to"
            value={toUsername}
            onChange={(e) => setToUsername(e.target.value)}
            error={error && !amount ? error : undefined}
            required
          />

          <Input
            label="Amount (USDT)"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={error && amount ? error : undefined}
            required
            min="0.0001"
            step="any"
          />

          <div className="pt-2">
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
            >
              Review Transfer
            </Button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 rounded-lg border border-navy-500 bg-navy-700/50 px-4 py-3">
          <div className="flex items-start gap-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0 text-navy-400"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <p className="text-xs text-navy-400">
              Transfers are processed instantly using optimistic locking.
              You cannot send to yourself, and you must have sufficient balance.
              All amounts are in USDT with up to 4 decimal places.
            </p>
          </div>
        </div>
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Confirm Transfer"
        onConfirm={handleConfirmTransfer}
        confirmLabel="Send Transfer"
        confirmVariant="primary"
        isLoading={isLoading}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-navy-400">Recipient</span>
            <span className="font-medium text-white">{toUsername.trim()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-400">Amount</span>
            <span className="font-medium text-white">
              {parseFloat(amount || '0').toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              USDT
            </span>
          </div>
          <div className="border-t border-navy-600 pt-3">
            <p className="text-xs text-navy-400">
              Please verify the details above. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
