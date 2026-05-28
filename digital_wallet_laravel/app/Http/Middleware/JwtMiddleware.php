<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Exceptions\AuthenticationException;
use App\Helpers\JwtHelper;
use Firebase\JWT\BeforeValidException;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use UnexpectedValueException;

class JwtMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            throw new AuthenticationException();
        }

        try {
            $payload = JwtHelper::decodeToken($token);
        } catch (ExpiredException|SignatureInvalidException|BeforeValidException|UnexpectedValueException $e) {
            throw new AuthenticationException();
        }

        if (!isset($payload->sub) || !is_scalar($payload->sub) || (string) $payload->sub === '') {
            throw new AuthenticationException();
        }

        $request->attributes->set('userId', (int) $payload->sub);

        return $next($request);
    }
}
