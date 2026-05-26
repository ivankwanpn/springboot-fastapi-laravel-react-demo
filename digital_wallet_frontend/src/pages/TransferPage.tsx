import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getWallet } from '../services/walletService';
import { transfer as transferService } from '../services/transactionService';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import type { Wallet } from '../types';
import type { AxiosError } from 'axios';

interface TransferFormData {
  toUsername: string;
  amount: string;
}

interface FormErrors {
  toUsername?: string;
  amount?: string;
}

export default function TransferPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<TransferFormData>({ toUsername: '', amount: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    getWallet()
      .then(setWallet)
      .catch((err) => setServerError(err instanceof Error ? err.message : 'Failed to load wallet'))
      .finally(() => setLoading(false));
  }, [user]);

  function validate(): FormErrors {
    const errs: FormErrors = {};
    const toUsername = form.toUsername.trim();
    const amount = form.amount.trim();

    if (!toUsername) errs.toUsername = 'Recipient username is required';
    else if (toUsername === user?.username) errs.toUsername = 'Cannot transfer to yourself';

    if (!amount) errs.amount = 'Amount is required';
    else if (!/^\d+(\.\d{1,4})?$/.test(amount)) errs.amount = 'Invalid amount format';
    else if (parseFloat(amount) <= 0) errs.amount = 'Amount must be greater than 0';
    else if (wallet && parseFloat(amount) > wallet.balance)
      errs.amount = 'Insufficient balance';

    return errs;
  }

  function handleChange(field: keyof TransferFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setServerError(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setIsSubmitting(true);
    try {
      await transferService({
        toUsername: form.toUsername.trim(),
        amount: form.amount.trim(),
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>;
      setServerError(
        axiosErr.response?.data?.message || 'Transfer failed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  }

  if (loading) return <Spinner className="h-10 w-10" />;

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-white mb-1">Send USDT</h1>
      <p className="text-sm text-navy-300 mb-6">Transfer USDT to another wallet</p>

      {wallet && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-navy-750 border border-navy-600 px-4 py-3">
          <span className="text-sm text-navy-300">Available:</span>
          <span className="text-sm font-mono font-semibold text-white">
            {wallet.balance.toFixed(4)} {wallet.currency}
          </span>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}
          <Input
            label="Recipient Username"
            name="toUsername"
            value={form.toUsername}
            onChange={(e) => handleChange('toUsername', e.target.value)}
            error={errors.toUsername}
            placeholder="Enter recipient's username"
          />
          <Input
            label="Amount (USDT)"
            name="amount"
            type="text"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => handleChange('amount', e.target.value)}
            error={errors.amount}
            placeholder="0.00"
          />
          <Button type="submit" className="w-full">
            Review Transfer
          </Button>
        </form>
      </Card>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Transfer"
        confirmLabel="Send USDT"
        isLoading={isSubmitting}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-navy-300">To Username</span>
            <span className="text-white font-medium">{form.toUsername.trim()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-navy-300">Amount</span>
            <span className="text-white font-mono font-semibold">
              {parseFloat(form.amount || '0').toFixed(4)} USDT
            </span>
          </div>
          <div className="border-t border-navy-600 pt-3 flex justify-between text-sm">
            <span className="text-navy-300">Remaining Balance</span>
            <span className="text-amber-400 font-mono font-medium">
              {wallet
                ? (wallet.balance - parseFloat(form.amount || '0')).toFixed(4)
                : '0.0000'}{' '}
              USDT
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
}
