<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class JwtHelper
{
    public static function generateToken(int $userId, string $username): string
    {
        $secret = config('jwt.secret');
        $expiration = config('jwt.expiration');

        $payload = [
            'sub' => (string) $userId,
            'username' => $username,
            'iat' => time(),
            'exp' => time() + (int)($expiration / 1000),
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    public static function decodeToken(string $token): object
    {
        $secret = config('jwt.secret');
        return JWT::decode($token, new Key($secret, 'HS256'));
    }
}
