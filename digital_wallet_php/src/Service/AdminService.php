<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\AppException;
use App\Util\Timestamp;

class AdminService
{
    public function listUsers(string $search, int $page, int $size): array
    {
        $size = max(1, min(100, $size));
        $offset = ($page - 1) * $size;

        $db = Database::getConnection();
        $searchParam = "%{$search}%";

        $stmt = $db->prepare('SELECT COUNT(*) FROM users WHERE username ILIKE :search');
        $stmt->execute([':search' => $searchParam]);
        $total = (int) $stmt->fetchColumn();

        $stmt = $db->prepare(
            'SELECT id, username, role, created_at FROM users WHERE username ILIKE :search ORDER BY id LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':search', $searchParam, \PDO::PARAM_STR);
        $stmt->bindValue(':limit', $size, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $data = array_map(function ($row) {
            return [
                'id' => (int) $row['id'],
                'username' => $row['username'],
                'role' => $row['role'],
                'createdAt' => Timestamp::format($row['created_at']),
            ];
        }, $rows);

        return [
            'data' => $data,
            'page' => $page,
            'size' => $size,
            'total' => $total,
        ];
    }

    public function getUserDetail(int $userId): array
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new AppException(404, "User not found with id: {$userId}");
        }

        $stmt = $db->prepare('SELECT * FROM wallets WHERE user_id = :user_id');
        $stmt->execute([':user_id' => $userId]);
        $walletRow = $stmt->fetch();

        $wallet = null;
        $recentTransactions = [];

        if ($walletRow) {
            $walletId = (int) $walletRow['id'];
            $wallet = [
                'id' => $walletId,
                'userId' => (int) $walletRow['user_id'],
                'currency' => $walletRow['currency'],
                'balance' => round((float) $walletRow['balance'], 4),
                'version' => (int) $walletRow['version'],
                'updatedAt' => Timestamp::format($walletRow['updated_at']),
            ];

            $stmt = $db->prepare(
                'SELECT t.*, fu.username AS from_username, tu.username AS to_username
                 FROM transactions t
                 LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
                 LEFT JOIN users fu ON fw.user_id = fu.id
                 LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
                 LEFT JOIN users tu ON tw.user_id = tu.id
                 WHERE t.from_wallet_id = :wallet_id OR t.to_wallet_id = :wallet_id
                 ORDER BY t.created_at DESC
                 LIMIT 5'
            );
            $stmt->execute([':wallet_id' => $walletId]);
            $txRows = $stmt->fetchAll();

            $recentTransactions = array_map(function ($tx) {
                return [
                    'id' => (int) $tx['id'],
                    'fromWalletId' => $tx['from_wallet_id'] !== null ? (int) $tx['from_wallet_id'] : null,
                    'toWalletId' => $tx['to_wallet_id'] !== null ? (int) $tx['to_wallet_id'] : null,
                    'fromUsername' => $tx['from_username'],
                    'toUsername' => $tx['to_username'],
                    'amount' => round((float) $tx['amount'], 4),
                    'txType' => $tx['tx_type'],
                    'status' => $tx['status'],
                    'createdAt' => Timestamp::format($tx['created_at']),
                ];
            }, $txRows);
        }

        return [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'role' => $user['role'],
            'createdAt' => Timestamp::format($user['created_at']),
            'wallet' => $wallet,
            'recentTransactions' => $recentTransactions,
        ];
    }

    public function disableUser(int $userId): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        if (!$stmt->fetch()) {
            throw new AppException(404, "User not found with id: {$userId}");
        }

        $stmt = $db->prepare("UPDATE users SET role = 'ROLE_DISABLED' WHERE id = :id");
        $stmt->execute([':id' => $userId]);
    }

    public function enableUser(int $userId): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT id FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        if (!$stmt->fetch()) {
            throw new AppException(404, "User not found with id: {$userId}");
        }

        $stmt = $db->prepare("UPDATE users SET role = 'ROLE_USER' WHERE id = :id");
        $stmt->execute([':id' => $userId]);
    }

    public function listTransactions(?string $username, ?string $fromDate, ?string $toDate, int $page, int $size): array
    {
        $size = max(1, min(100, $size));
        $offset = ($page - 1) * $size;

        $db = Database::getConnection();

        $conditions = [];
        $params = [];

        if ($username !== null && $username !== '') {
            $conditions[] = '(fu.username ILIKE :username OR tu.username ILIKE :username)';
            $params[':username'] = "%{$username}%";
        }
        if ($fromDate !== null && $fromDate !== '') {
            $conditions[] = 't.created_at >= :fromDate';
            $params[':fromDate'] = $fromDate;
        }
        if ($toDate !== null && $toDate !== '') {
            $conditions[] = 't.created_at <= :toDate';
            $params[':toDate'] = $toDate;
        }

        $where = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $baseFrom = "FROM transactions t
            LEFT JOIN wallets fw ON t.from_wallet_id = fw.id
            LEFT JOIN users fu ON fw.user_id = fu.id
            LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
            LEFT JOIN users tu ON tw.user_id = tu.id
            {$where}";

        $countStmt = $db->prepare("SELECT COUNT(*) {$baseFrom}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $dataParams = $params;
        $dataStmt = $db->prepare(
            "SELECT t.*, fu.username AS from_username, tu.username AS to_username {$baseFrom} ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($dataParams as $key => $value) {
            $dataStmt->bindValue($key, $value, \PDO::PARAM_STR);
        }
        $dataStmt->bindValue(':limit', $size, \PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $dataStmt->execute();
        $rows = $dataStmt->fetchAll();

        $data = array_map(function ($tx) {
            return [
                'id' => (int) $tx['id'],
                'fromWalletId' => $tx['from_wallet_id'] !== null ? (int) $tx['from_wallet_id'] : null,
                'toWalletId' => $tx['to_wallet_id'] !== null ? (int) $tx['to_wallet_id'] : null,
                'fromUsername' => $tx['from_username'],
                'toUsername' => $tx['to_username'],
                'amount' => round((float) $tx['amount'], 4),
                'txType' => $tx['tx_type'],
                'status' => $tx['status'],
                'createdAt' => Timestamp::format($tx['created_at']),
            ];
        }, $rows);

        return [
            'data' => $data,
            'page' => $page,
            'size' => $size,
            'total' => $total,
        ];
    }

    public function getTransactionStats(?string $fromDate, ?string $toDate): array
    {
        $db = Database::getConnection();

        $conditions = [];
        $params = [];

        if ($fromDate !== null && $fromDate !== '') {
            $conditions[] = 'created_at >= :fromDate';
            $params[':fromDate'] = $fromDate;
        }
        if ($toDate !== null && $toDate !== '') {
            $conditions[] = 'created_at <= :toDate';
            $params[':toDate'] = $toDate;
        }

        $where = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $summaryStmt = $db->prepare(
            "SELECT COUNT(*)::bigint AS total_transactions, COALESCE(SUM(amount), 0) AS total_amount FROM transactions {$where}"
        );
        $summaryStmt->execute($params);
        $summary = $summaryStmt->fetch();

        $dailyStmt = $db->prepare(
            "SELECT DATE(created_at) AS date, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount FROM transactions {$where} GROUP BY DATE(created_at) ORDER BY date"
        );
        $dailyStmt->execute($params);
        $dailyRows = $dailyStmt->fetchAll();

        $dailyVolume = array_map(function ($row) {
            return [
                'date' => $row['date'],
                'count' => (int) $row['count'],
                'amount' => $row['amount'],
            ];
        }, $dailyRows);

        return [
            'totalTransactions' => (int) $summary['total_transactions'],
            'totalAmount' => $summary['total_amount'],
            'dailyVolume' => $dailyVolume,
        ];
    }
}
