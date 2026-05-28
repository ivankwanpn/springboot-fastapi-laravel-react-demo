<?php

namespace App\Middleware;

use App\Exception\AuthenticationException;
use App\Util\JwtHelper;
use App\Util\Request;

class JwtMiddleware
{
    public static function handle(Request $request): void
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new AuthenticationException();
        }

        $token = substr($authHeader, 7);

        try {
            $payload = JwtHelper::decodeToken($token);
            $request->setAttribute('userId', (int) $payload->sub);
        } catch (\Exception $e) {
            throw new AuthenticationException();
        }
    }
}
