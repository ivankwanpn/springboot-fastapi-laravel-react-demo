<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\WalletNotFoundException;
use App\Util\Timestamp;

class WalletService
{
    public function getWalletByUserId(int $userId): array
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        $wallet = $stmt->fetch();

        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        return [
            'id' => (int) $wallet['id'],
            'userId' => (int) $wallet['user_id'],
            'currency' => $wallet['currency'],
            'balance' => round((float) $wallet['balance'], 4),
            'version' => (int) $wallet['version'],
            'updatedAt' => Timestamp::format($wallet['updated_at']),
        ];
    }
}
