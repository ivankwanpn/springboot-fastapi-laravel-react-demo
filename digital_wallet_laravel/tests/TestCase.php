<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use App\Helpers\JwtHelper;
use App\Models\User;
use App\Models\Wallet;

abstract class TestCase extends BaseTestCase
{
    use DatabaseTransactions;
    /**
     * Generate a JWT token for the given user attributes.
     */
    protected function getToken(int $userId, string $username, string $role = 'ROLE_USER'): string
    {
        return JwtHelper::generateToken($userId, $username, $role);
    }

    /**
     * Create a user with a wallet and return the user model.
     */
    protected function createUser(string $username, string $password, string $role = 'ROLE_USER', float $balance = 0): User
    {
        $user = User::create([
            'username' => $username,
            'password_hash' => bcrypt($password),
            'role' => $role,
        ]);

        Wallet::create([
            'user_id' => $user->id,
            'currency' => 'USDT',
            'balance' => $balance,
            'version' => 0,
        ]);

        return $user;
    }
}
