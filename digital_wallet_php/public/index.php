<?php

error_reporting(E_ALL);
ini_set('display_errors', '0');

require __DIR__ . '/../vendor/autoload.php';

use App\Exception\AppException;
use App\Middleware\AdminMiddleware;
use App\Middleware\JwtMiddleware;
use App\Service\AdminService;
use App\Service\AuthService;
use App\Service\WalletService;
use App\Service\TransactionService;
use App\Util\JsonResponse;
use App\Util\Request;

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$request = new Request();

try {
    $routeKey = "$method $uri";
    $route = match ($routeKey) {
        'POST /api/auth/register' => false,
        'POST /api/auth/login' => false,
        'GET /api/wallets' => true,
        'POST /api/transactions/transfer' => true,
        'GET /api/transactions' => true,
        'GET /api/admin/users' => 'admin',
        'GET /api/admin/transactions' => 'admin',
        'GET /api/admin/transactions/stats' => 'admin',
        default => null,
    };

    if ($route === null && str_starts_with($uri, '/api/admin/')) {
        $route = 'admin';
    }

    if ($route === null) {
        JsonResponse::send(['status' => 'ERROR', 'message' => 'Not found'], 404);
    }

    if ($route === true) {
        JwtMiddleware::handle($request);
    }

    if ($route === 'admin') {
        JwtMiddleware::handle($request);
        AdminMiddleware::handle($request);
    }

    if ($route === 'admin') {
        $parts = explode('/', trim($uri, '/'));

        // GET /api/admin/users
        if ($method === 'GET' && $uri === '/api/admin/users') {
            $adminService = new AdminService();
            $result = $adminService->listUsers(
                $request->input('search', ''),
                (int) $request->input('page', 1),
                (int) $request->input('size', 10)
            );
            JsonResponse::send($result);
        }

        // GET /api/admin/users/{id}
        if ($method === 'GET' && count($parts) === 4 && $parts[2] === 'users' && is_numeric($parts[3])) {
            $adminService = new AdminService();
            $result = $adminService->getUserDetail((int) $parts[3]);
            JsonResponse::send($result);
        }

        // PUT /api/admin/users/{id}/disable
        if ($method === 'PUT' && count($parts) === 5 && $parts[2] === 'users' && $parts[4] === 'disable' && is_numeric($parts[3])) {
            $adminService = new AdminService();
            $adminService->disableUser((int) $parts[3]);
            JsonResponse::send(['status' => 'SUCCESS', 'message' => 'User disabled successfully']);
        }

        // PUT /api/admin/users/{id}/enable
        if ($method === 'PUT' && count($parts) === 5 && $parts[2] === 'users' && $parts[4] === 'enable' && is_numeric($parts[3])) {
            $adminService = new AdminService();
            $adminService->enableUser((int) $parts[3]);
            JsonResponse::send(['status' => 'SUCCESS', 'message' => 'User enabled successfully']);
        }

        // GET /api/admin/transactions
        if ($method === 'GET' && $uri === '/api/admin/transactions') {
            $adminService = new AdminService();
            $result = $adminService->listTransactions(
                $request->input('username', null),
                $request->input('fromDate', null),
                $request->input('toDate', null),
                (int) $request->input('page', 1),
                (int) $request->input('size', 10)
            );
            JsonResponse::send($result);
        }

        // GET /api/admin/transactions/stats
        if ($method === 'GET' && $uri === '/api/admin/transactions/stats') {
            $adminService = new AdminService();
            $result = $adminService->getTransactionStats(
                $request->input('fromDate', null),
                $request->input('toDate', null)
            );
            JsonResponse::send($result);
        }

        JsonResponse::send(['status' => 'ERROR', 'message' => 'Not found'], 404);
    }

    switch ($uri) {
        case '/api/auth/register':
            $authService = new AuthService();
            $authService->register(
                $request->input('username', ''),
                $request->input('password', '')
            );
            JsonResponse::send(
                ['status' => 'SUCCESS', 'message' => 'User registered successfully'],
                201
            );
            break;

        case '/api/auth/login':
            $authService = new AuthService();
            $result = $authService->login(
                $request->input('username', ''),
                $request->input('password', '')
            );
            JsonResponse::send($result);
            break;

        case '/api/wallets':
            $walletService = new WalletService();
            $result = $walletService->getWalletByUserId(
                $request->getAttribute('userId')
            );
            JsonResponse::send($result);
            break;

        case '/api/transactions/transfer':
            $txService = new TransactionService();
            $txService->transfer(
                $request->getAttribute('userId'),
                (string) $request->input('toUsername', ''),
                (string) $request->input('amount', '')
            );
            JsonResponse::send(
                ['status' => 'SUCCESS', 'message' => 'Transfer completed successfully']
            );
            break;

        case '/api/transactions':
            $txService = new TransactionService();
            $result = $txService->getTransactionHistory(
                $request->getAttribute('userId')
            );
            JsonResponse::send($result);
            break;
    }
} catch (AppException $e) {
    JsonResponse::send(
        ['status' => 'ERROR', 'message' => $e->getMessage()],
        $e->getStatusCode()
    );
} catch (\Exception $e) {
    error_log($e->getMessage() . "\n" . $e->getTraceAsString());
    JsonResponse::send(
        ['status' => 'ERROR', 'message' => 'Internal server error'],
        500
    );
}
