<?php

namespace App\Middleware;

use App\Exception\AppException;
use App\Util\Request;

class AdminMiddleware
{
    public static function handle(Request $request): void
    {
        if ($request->getAttribute('userRole') !== 'ROLE_ADMIN') {
            throw new AppException(403, 'Access denied');
        }
    }
}
