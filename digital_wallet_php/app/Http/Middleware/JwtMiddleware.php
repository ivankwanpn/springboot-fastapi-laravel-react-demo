<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Exceptions\AuthenticationException;
use App\Helpers\JwtHelper;

class JwtMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $authHeader = $request->header('Authorization');

        if (!$authHeader || !str_starts_with($authHeader, 'Bearer ')) {
            throw new AuthenticationException('Invalid username or password');
        }

        $token = substr($authHeader, 7);

        try {
            $payload = JwtHelper::decodeToken($token);
            $request->attributes->set('userId', (int) $payload->sub);
        } catch (\Exception $e) {
            throw new AuthenticationException('Invalid username or password');
        }

        return $next($request);
    }
}
