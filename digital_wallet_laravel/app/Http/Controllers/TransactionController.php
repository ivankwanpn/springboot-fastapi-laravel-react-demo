<?php

namespace App\Http\Controllers;

use App\Http\Requests\TransferRequest;
use App\Services\TransactionService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    private TransactionService $transactionService;

    public function __construct(TransactionService $transactionService)
    {
        $this->transactionService = $transactionService;
    }

    public function transfer(TransferRequest $request)
    {
        $fromUserId = $request->attributes->get('userId');

        $this->transactionService->transfer(
            $fromUserId,
            (string) $request->input('toUsername'),
            (string) $request->input('amount'),
        );

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'Transfer completed successfully',
        ]);
    }

    public function history(Request $request)
    {
        $userId = $request->attributes->get('userId');

        $transactions = $this->transactionService->getTransactionHistory($userId);

        return response()->json($transactions);
    }
}
