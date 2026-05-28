<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use App\Http\Middleware\JwtMiddleware;
use App\Exceptions\AppException;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'jwt.auth' => JwtMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (AppException $e, $request) {
            return response()->json([
                'status' => 'ERROR',
                'message' => $e->getMessage(),
            ], $e->getStatusCode());
        });

        $exceptions->render(function (ValidationException $e, $request) {
            return response()->json([
                'status' => 'ERROR',
                'message' => $e->validator->errors()->first(),
            ], 400);
        });

        $exceptions->render(function (\Throwable $e, $request) {
            \Illuminate\Support\Facades\Log::error($e);
            return response()->json([
                'status' => 'ERROR',
                'message' => 'Internal server error',
            ], 500);
        });
    })->create();
