<?php

namespace App\Config;

class Jwt
{
    public static function secret(): string
    {
        return getenv('JWT_SECRET') ?: '404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970';
    }

    public static function expirationMs(): int
    {
        return (int)(getenv('JWT_EXPIRATION') ?: 86400000);
    }

    public const ALGORITHM = 'HS256';
}
