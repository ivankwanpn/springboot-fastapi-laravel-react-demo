<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\AppException;
use App\Exception\ConcurrentModificationException;
use App\Exception\InsufficientBalanceException;
use App\Exception\WalletNotFoundException;
use App\Util\Timestamp;

class TransactionService
{
    public function transfer(int $fromUserId, string $toUsername, string $amount): void
    {
        if ($toUsername === '' || strlen($toUsername) < 3) {
            throw new AppException(400, 'The to username field is required.');
        }
        if ($amount === '' || !is_numeric($amount)) {
            throw new AppException(400, 'The amount field is required.');
        }
        if (bccomp($amount, '0', 4) <= 0) {
            throw new AppException(400, 'Transfer amount must be greater than zero');
        }

        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            $stmt = $db->prepare('SELECT * FROM users WHERE username = :username');
            $stmt->execute([':username' => $toUsername]);
            $toUser = $stmt->fetch();
            if (!$toUser) {
                throw new AppException(400, "Recipient not found: {$toUsername}");
            }

            $toUserId = (int) $toUser['id'];
            if ($fromUserId === $toUserId) {
                throw new AppException(400, 'Cannot transfer to yourself');
            }

            $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
            $stmt->execute([':user_id' => $fromUserId]);
            $fromWallet = $stmt->fetch();
            if (!$fromWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$fromUserId}");
            }

            $stmt->execute([':user_id' => $toUserId]);
            $toWallet = $stmt->fetch();
            if (!$toWallet) {
                throw new WalletNotFoundException("Wallet not found for userId: {$toUserId}");
            }

            if (bccomp((string) $fromWallet['balance'], $amount, 4) < 0) {
                throw new InsufficientBalanceException(
                    "Insufficient balance: {$fromWallet['balance']} < {$amount}"
                );
            }

            $stmt = $db->prepare(
                'UPDATE wallets SET balance = balance - :amount, version = version + 1, updated_at = NOW() WHERE user_id = :user_id AND version = :version'
            );
            $stmt->execute([
                ':amount' => $amount,
                ':user_id' => $fromUserId,
                ':version' => (int) $fromWallet['version'],
            ]);

            if ($stmt->rowCount() === 0) {
                throw new ConcurrentModificationException(
                    "Concurrent modification detected for userId: {$fromUserId}"
                );
            }

            $stmt = $db->prepare(
                'UPDATE wallets SET balance = balance + :amount, version = version + 1, updated_at = NOW() WHERE user_id = :user_id'
            );
            $stmt->execute([
                ':amount' => $amount,
                ':user_id' => $toUserId,
            ]);

            $stmt = $db->prepare(
                'INSERT INTO transactions (from_wallet_id, to_wallet_id, amount, tx_type, status) VALUES (:from_wallet_id, :to_wallet_id, :amount, :tx_type, :status)'
            );
            $stmt->execute([
                ':from_wallet_id' => (int) $fromWallet['id'],
                ':to_wallet_id' => (int) $toWallet['id'],
                ':amount' => $amount,
                ':tx_type' => 'TRANSFER',
                ':status' => 'SUCCESS',
            ]);

            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            throw $e;
        }
    }

    public function getTransactionHistory(int $userId): array
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        $wallet = $stmt->fetch();
        if (!$wallet) {
            throw new WalletNotFoundException("Wallet not found for userId: {$userId}");
        }

        $stmt = $db->prepare(
            'SELECT * FROM transactions WHERE from_wallet_id = :wallet_id OR to_wallet_id = :wallet_id ORDER BY created_at DESC'
        );
        $stmt->execute([':wallet_id' => (int) $wallet['id']]);
        $transactions = $stmt->fetchAll();

        return array_map(function ($tx) {
            return [
                'id' => (int) $tx['id'],
                'fromWalletId' => $tx['from_wallet_id'] !== null ? (int) $tx['from_wallet_id'] : null,
                'toWalletId' => $tx['to_wallet_id'] !== null ? (int) $tx['to_wallet_id'] : null,
                'amount' => round((float) $tx['amount'], 4),
                'txType' => $tx['tx_type'],
                'status' => $tx['status'],
                'createdAt' => Timestamp::format($tx['created_at']),
            ];
        }, $transactions);
    }
}
