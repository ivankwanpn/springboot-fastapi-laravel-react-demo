<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 7. Get wallet with JWT — GET /api/wallets → 200
     */
    public function test_get_wallet_authenticated(): void
    {
        $user = $this->createUser('testuser', 'password123');
        $token = $this->getToken($user->id, $user->username);

        $response = $this->withToken($token)->getJson('/api/wallets');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'id',
                'userId',
                'currency',
                'balance',
                'version',
                'updatedAt',
            ])
            ->assertJsonPath('userId', $user->id)
            ->assertJsonPath('currency', 'USDT')
            ->assertJsonPath('balance', 0);
    }

    /**
     * 8. Get wallet without auth — GET /api/wallets → 401
     */
    public function test_get_wallet_no_auth_returns_401(): void
    {
        $response = $this->getJson('/api/wallets');

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Invalid username or password',
            ]);
    }

    /**
     * 8b. Get wallet with invalid JWT — GET /api/wallets → 401
     */
    public function test_get_wallet_with_malformed_token_returns_401(): void
    {
        $response = $this->withToken('not.a.valid.jwt')->getJson('/api/wallets');

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Invalid username or password',
            ]);
    }

    /**
     * 8c. Get wallet with empty token — GET /api/wallets → 401
     */
    public function test_get_wallet_with_empty_token_returns_401(): void
    {
        $response = $this->withToken('')->getJson('/api/wallets');

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Invalid username or password',
            ]);
    }
}
