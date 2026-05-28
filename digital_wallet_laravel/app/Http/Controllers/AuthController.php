<?php

namespace App\Http\Controllers;

use App\Http\Requests\RegisterRequest;
use App\Http\Requests\LoginRequest;
use App\Services\AuthService;

class AuthController extends Controller
{
    private AuthService $authService;

    public function __construct(AuthService $authService)
    {
        $this->authService = $authService;
    }

    public function register(RegisterRequest $request)
    {
        $this->authService->register(
            $request->input('username'),
            $request->input('password'),
        );

        return response()->json([
            'status' => 'SUCCESS',
            'message' => 'User registered successfully',
        ], 201);
    }

    public function login(LoginRequest $request)
    {
        $result = $this->authService->login(
            $request->input('username'),
            $request->input('password'),
        );

        return response()->json($result);
    }
}
