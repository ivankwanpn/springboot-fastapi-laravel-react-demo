<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Exceptions\AppException;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $role = $request->attributes->get('userRole');

        if ($role !== 'ROLE_ADMIN') {
            throw new AppException(403, 'Access denied');
        }

        return $next($request);
    }
}
