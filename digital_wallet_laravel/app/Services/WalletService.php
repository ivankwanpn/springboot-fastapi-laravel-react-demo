<?php

namespace App\Services;

use App\Exceptions\WalletNotFoundException;
use App\Models\Wallet;

class WalletService
{
    public function getWalletByUserId(int $userId): array
    {
        $wallet = Wallet::where('user_id', $userId)->first();

        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        return [
            'id' => $wallet->id,
            'userId' => $wallet->user_id,
            'currency' => $wallet->currency,
            'balance' => round((float) $wallet->balance, 4),
            'version' => $wallet->version,
            'updatedAt' => $wallet->updated_at?->toISOString(),
        ];
    }
}
