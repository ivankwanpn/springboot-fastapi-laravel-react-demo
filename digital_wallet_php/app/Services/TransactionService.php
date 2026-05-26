<?php

namespace App\Services;

use App\Exceptions\AppException;
use App\Exceptions\WalletNotFoundException;
use App\Exceptions\InsufficientBalanceException;
use App\Exceptions\ConcurrentModificationException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class TransactionService
{
    public function transfer(int $fromUserId, string $toUsername, string $amount): void
    {
        if (bccomp($amount, '0', 4) <= 0) {
            throw new AppException(400, 'Transfer amount must be greater than zero');
        }

        DB::transaction(function () use ($fromUserId, $toUsername, $amount) {
            $amountFloat = (float) $amount;

            // lookup recipient by username
            $toUser = User::where('username', $toUsername)->first();
            if (!$toUser) {
                throw new AppException(400, "Recipient not found: {$toUsername}");
            }
            $toUserId = $toUser->id;
            if ($fromUserId === $toUserId) {
                throw new AppException(400, 'Cannot transfer to yourself');
            }

            $fromWallet = Wallet::where('user_id', $fromUserId)->first();
            if (!$fromWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$fromUserId}");
            }

            $toWallet = Wallet::where('user_id', $toUserId)->first();
            if (!$toWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$toUserId}");
            }

            if (bccomp((string) $fromWallet->balance, $amount, 4) < 0) {
                throw new InsufficientBalanceException(
                    "Insufficient balance: {$fromWallet->balance} < {$amount}"
                );
            }

            // optimistic lock deduct
            $deducted = Wallet::where('user_id', $fromUserId)
                ->where('version', $fromWallet->version)
                ->update([
                    'balance' => DB::raw('balance - ' . $amountFloat),
                    'version' => DB::raw('version + 1'),
                    'updated_at' => now(),
                ]);

            if ($deducted === 0) {
                throw new ConcurrentModificationException(
                    "Concurrent modification detected for userId: {$fromUserId}"
                );
            }

            // add balance
            Wallet::where('user_id', $toUserId)
                ->update([
                    'balance' => DB::raw('balance + ' . $amountFloat),
                    'version' => DB::raw('version + 1'),
                    'updated_at' => now(),
                ]);

            // record transaction
            Transaction::create([
                'from_wallet_id' => $fromWallet->id,
                'to_wallet_id' => $toWallet->id,
                'amount' => $amountFloat,
                'tx_type' => 'TRANSFER',
                'status' => 'SUCCESS',
            ]);
        });
    }

    public function getTransactionHistory(int $userId): array
    {
        $wallet = Wallet::where('user_id', $userId)->first();
        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        $transactions = Transaction::where('from_wallet_id', $wallet->id)
            ->orWhere('to_wallet_id', $wallet->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return $transactions->map(function ($tx) {
            return [
                'id' => $tx->id,
                'fromWalletId' => $tx->from_wallet_id,
                'toWalletId' => $tx->to_wallet_id,
                'amount' => round((float) $tx->amount, 4),
                'txType' => $tx->tx_type,
                'status' => $tx->status,
                'createdAt' => $tx->created_at?->toISOString(),
            ];
        })->all();
    }
}
