<?php

namespace App\Services;

use App\Exceptions\AuthenticationException;
use App\Exceptions\DuplicateUsernameException;
use App\Helpers\JwtHelper;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function register(string $username, string $password): User
    {
        return DB::transaction(function () use ($username, $password) {
            try {
                $user = User::create([
                    'username' => $username,
                    'password_hash' => Hash::make($password),
                    'role' => 'ROLE_USER',
                ]);
            } catch (\Illuminate\Database\UniqueConstraintViolationException $e) {
                throw new DuplicateUsernameException("Username '{$username}' is already taken");
            }

            Wallet::create([
                'user_id' => $user->id,
                'currency' => 'USDT',
                'balance' => 0,
                'version' => 0,
            ]);

            return $user;
        });
    }

    public function login(string $username, string $password): array
    {
        $user = User::where('username', $username)->first();

        if (!$user) {
            throw new AuthenticationException('Invalid username or password');
        }

        if (!Hash::check($password, $user->password_hash)) {
            throw new AuthenticationException('Invalid username or password');
        }

        $token = JwtHelper::generateToken($user->id, $user->username);

        return [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'role' => $user->role,
                'createdAt' => $user->created_at?->toISOString(),
            ],
        ];
    }
}
