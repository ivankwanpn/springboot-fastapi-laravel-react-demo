<?php

namespace App\Helpers;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;

class JwtHelper
{
    public static function generateToken(int $userId, string $username): string
    {
        $secret = self::getSecret();
        $expirationSeconds = self::getExpirationSeconds();

        $payload = [
            'sub' => (string) $userId,
            'username' => $username,
            'iat' => time(),
            'exp' => time() + $expirationSeconds,
        ];

        return JWT::encode($payload, $secret, 'HS256');
    }

    public static function decodeToken(string $token): object
    {
        return JWT::decode($token, new Key(self::getSecret(), 'HS256'));
    }

    private static function getSecret(): string
    {
        $secret = config('jwt.secret');

        if (!is_string($secret) || trim($secret) === '') {
            throw new RuntimeException('JWT secret is not configured');
        }

        return $secret;
    }

    private static function getExpirationSeconds(): int
    {
        $expirationMs = config('jwt.expiration');

        if (!is_numeric($expirationMs) || (int) $expirationMs <= 0) {
            throw new RuntimeException('JWT expiration is invalid');
        }

        $expirationSeconds = intdiv((int) $expirationMs, 1000);

        if ($expirationSeconds <= 0) {
            throw new RuntimeException('JWT expiration must be at least 1000 milliseconds');
        }

        return $expirationSeconds;
    }
}
