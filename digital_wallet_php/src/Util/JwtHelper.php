<?php

namespace App\Util;

use App\Config\Jwt;
use Firebase\JWT\JWT as FirebaseJWT;
use Firebase\JWT\Key;

class JwtHelper
{
    public static function generateToken(int $userId, string $username): string
    {
        $payload = [
            'sub' => (string) $userId,
            'username' => $username,
            'iat' => time(),
            'exp' => time() + (int)(Jwt::expirationMs() / 1000),
        ];

        return FirebaseJWT::encode($payload, Jwt::secret(), Jwt::ALGORITHM);
    }

    public static function decodeToken(string $token): object
    {
        return FirebaseJWT::decode($token, new Key(Jwt::secret(), Jwt::ALGORITHM));
    }
}
