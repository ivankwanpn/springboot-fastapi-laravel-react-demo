<?php

error_reporting(E_ALL);
ini_set('display_errors', '0');

require __DIR__ . '/../vendor/autoload.php';

use App\Exception\AppException;
use App\Middleware\JwtMiddleware;
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
        default => null,
    };

    if ($route === null) {
        JsonResponse::send(['status' => 'ERROR', 'message' => 'Not found'], 404);
    }

    if ($route === true) {
        JwtMiddleware::handle($request);
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
