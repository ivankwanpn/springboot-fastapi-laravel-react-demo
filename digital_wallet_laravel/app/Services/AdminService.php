<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class AdminService
{
    public function listUsers(string $search, int $page, int $size): array
    {
        $size = max(1, min(100, $size));

        $query = User::select('id', 'username', 'role', 'created_at')
            ->when($search, function ($q) use ($search) {
                $q->where('username', 'like', '%' . $search . '%');
            })
            ->orderBy('id');

        $count = $query->count();
        $users = $query->skip(($page - 1) * $size)->take($size)->get();

        return [
            'data' => $users,
            'page' => $page,
            'size' => $size,
            'total' => $count,
        ];
    }

    public function getUserDetail($id): array
    {
        $user = User::findOrFail($id);
        $wallet = Wallet::where('user_id', $id)->first();
        $recentTransactions = [];

        if ($wallet) {
            $recentTransactions = Transaction::where('from_wallet_id', $wallet->id)
                ->orWhere('to_wallet_id', $wallet->id)
                ->latest()
                ->limit(5)
                ->get();
        }

        return [
            'user' => $user,
            'wallet' => $wallet,
            'recentTransactions' => $recentTransactions,
        ];
    }

    public function disableUser($id): void
    {
        User::findOrFail($id)->update(['role' => 'ROLE_DISABLED']);
    }

    public function enableUser($id): void
    {
        User::findOrFail($id)->update(['role' => 'ROLE_USER']);
    }

    public function listTransactions(int $page, int $size, string $username, string $startDate, string $endDate): array
    {
        $size = max(1, min(100, $size));

        $query = Transaction::with(['fromWallet.user', 'toWallet.user'])
            ->when($username, function ($q) use ($username) {
                $q->whereHas('fromWallet.user', function ($sub) use ($username) {
                    $sub->where('username', 'like', '%' . $username . '%');
                })->orWhereHas('toWallet.user', function ($sub) use ($username) {
                    $sub->where('username', 'like', '%' . $username . '%');
                });
            })
            ->when($startDate, function ($q) use ($startDate) {
                $q->where('created_at', '>=', $startDate);
            })
            ->when($endDate, function ($q) use ($endDate) {
                $q->where('created_at', '<=', $endDate);
            })
            ->orderBy('id', 'desc');

        $count = $query->count();
        $transactions = $query->skip(($page - 1) * $size)->take($size)->get();

        $data = $transactions->map(function ($tx) {
            return [
                'id' => $tx->id,
                'fromWalletId' => $tx->from_wallet_id,
                'toWalletId' => $tx->to_wallet_id,
                'fromUsername' => $tx->fromWallet->user->username ?? null,
                'toUsername' => $tx->toWallet->user->username ?? null,
                'amount' => $tx->amount,
                'txType' => $tx->tx_type,
                'status' => $tx->status,
                'createdAt' => $tx->created_at?->toISOString(),
            ];
        });

        return [
            'data' => $data,
            'page' => $page,
            'size' => $size,
            'total' => $count,
        ];
    }

    public function getTransactionStats(string $startDate, string $endDate): array
    {
        $thirtyDaysAgo = now()->subDays(30)->startOfDay()->toDateTimeString();

        if (!$startDate) {
            $startDate = $thirtyDaysAgo;
        }
        if (!$endDate) {
            $endDate = now()->endOfDay()->toDateTimeString();
        }

        $totalCount = Transaction::whereBetween('created_at', [$startDate, $endDate])->count();
        $totalAmount = Transaction::whereBetween('created_at', [$startDate, $endDate])->sum('amount');

        $daily = DB::select(
            "SELECT DATE(created_at) as date, COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
             FROM transactions
             WHERE created_at >= ? AND created_at <= ?
             GROUP BY DATE(created_at)
             ORDER BY date",
            [$startDate, $endDate]
        );

        $dailyStats = array_map(function ($row) {
            return [
                'date' => $row->date,
                'count' => $row->count,
                'amount' => $row->amount,
            ];
        }, $daily);

        return [
            'totalCount' => $totalCount,
            'totalAmount' => $totalAmount,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'daily' => $dailyStats,
        ];
    }
}
