<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\WalletController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\AdminController;

Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('jwt.auth')->group(function () {
    Route::get('/wallets', [WalletController::class, 'show']);
    Route::post('/transactions/transfer', [TransactionController::class, 'transfer']);
    Route::get('/transactions', [TransactionController::class, 'history']);
});

Route::middleware(['jwt.auth', 'admin.role'])->prefix('admin')->group(function () {
    Route::get('/users', [AdminController::class, 'listUsers']);
    Route::get('/users/{id}', [AdminController::class, 'getUserDetail']);
    Route::put('/users/{id}/disable', [AdminController::class, 'disableUser']);
    Route::put('/users/{id}/enable', [AdminController::class, 'enableUser']);
    Route::get('/transactions', [AdminController::class, 'listTransactions']);
    Route::get('/transactions/stats', [AdminController::class, 'getTransactionStats']);
});
