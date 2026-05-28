<?php

namespace App\Service;

use App\Config\Database;
use App\Exception\AppException;
use App\Exception\AuthenticationException;
use App\Exception\DuplicateUsernameException;
use App\Util\JwtHelper;
use App\Util\Timestamp;
use PDOException;

class AuthService
{
    public function register(string $username, string $password): void
    {
        if ($username === '' || strlen($username) < 3) {
            throw new AppException(400, 'The username field is required and must be at least 3 characters.');
        }
        if ($password === '' || strlen($password) < 6) {
            throw new AppException(400, 'The password field is required and must be at least 6 characters.');
        }

        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            $hash = password_hash($password, PASSWORD_BCRYPT);

            $stmt = $db->prepare(
                'INSERT INTO users (username, password_hash, role) VALUES (:username, :password_hash, :role) RETURNING id'
            );
            $stmt->execute([
                ':username' => $username,
                ':password_hash' => $hash,
                ':role' => 'ROLE_USER',
            ]);
            $userId = $stmt->fetchColumn();

            $stmt = $db->prepare(
                'INSERT INTO wallets (user_id, currency, balance, version) VALUES (:user_id, :currency, :balance, :version)'
            );
            $stmt->execute([
                ':user_id' => $userId,
                ':currency' => 'USDT',
                ':balance' => 0,
                ':version' => 0,
            ]);

            $db->commit();
        } catch (PDOException $e) {
            $db->rollBack();
            if ($e->getCode() === '23505') {
                throw new DuplicateUsernameException("Username '{$username}' is already taken");
            }
            throw $e;
        }
    }

    public function login(string $username, string $password): array
    {
        if ($username === '') {
            throw new AppException(400, 'The username field is required.');
        }
        if ($password === '') {
            throw new AppException(400, 'The password field is required.');
        }

        $db = Database::getConnection();

        $stmt = $db->prepare('SELECT * FROM users WHERE username = :username');
        $stmt->execute([':username' => $username]);
        $user = $stmt->fetch();

        if (!$user) {
            throw new AuthenticationException();
        }

        if (!password_verify($password, $user['password_hash'])) {
            throw new AuthenticationException();
        }

        $token = JwtHelper::generateToken($user['id'], $user['username']);

        return [
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'createdAt' => Timestamp::format($user['created_at']),
            ],
        ];
    }
}
