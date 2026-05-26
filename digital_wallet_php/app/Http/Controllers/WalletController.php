<?php

namespace App\Http\Controllers;

use App\Services\WalletService;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    private WalletService $walletService;

    public function __construct(WalletService $walletService)
    {
        $this->walletService = $walletService;
    }

    public function show(Request $request)
    {
        $userId = $request->attributes->get('userId');

        $wallet = $this->walletService->getWalletByUserId($userId);

        return response()->json($wallet);
    }
}
