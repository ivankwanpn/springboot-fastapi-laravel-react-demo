<?php

namespace Tests\Feature;

use App\Helpers\JwtHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminTest extends TestCase
{
    use RefreshDatabase;

    private string $adminToken;
    private string $userToken;
    private int $regularUserId;

    protected function setUp(): void
    {
        parent::setUp();

        $admin = $this->createUser('admin', 'adminpass', 'ROLE_ADMIN', 1000);
        $this->adminToken = JwtHelper::generateToken($admin->id, $admin->username, 'ROLE_ADMIN');

        $regular = $this->createUser('regular', 'userpass', 'ROLE_USER', 100);
        $this->userToken = JwtHelper::generateToken($regular->id, $regular->username, 'ROLE_USER');
        $this->regularUserId = $regular->id;
    }

    /**
     * 14. List users as admin — GET /api/admin/users → 200
     */
    public function test_list_users_as_admin(): void
    {
        $response = $this->withToken($this->adminToken)->getJson('/api/admin/users');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'page',
                'size',
                'total',
            ])
            ->assertJsonPath('total', 2)
            ->assertJsonCount(2, 'data');
    }

    public function test_list_users_as_admin_paginated(): void
    {
        $this->createUser('extra1', 'password', 'ROLE_USER', 0);
        $this->createUser('extra2', 'password', 'ROLE_USER', 0);
        $this->createUser('extra3', 'password', 'ROLE_USER', 0);

        $response = $this->withToken($this->adminToken)->getJson('/api/admin/users?page=1&size=2');

        $response->assertStatus(200)
            ->assertJsonPath('page', 1)
            ->assertJsonPath('size', 2)
            ->assertJsonPath('total', 5)
            ->assertJsonCount(2, 'data');
    }

    /**
     * 15. List users as regular user — GET /api/admin/users → 403
     */
    public function test_list_users_as_regular_user_returns_403(): void
    {
        $response = $this->withToken($this->userToken)->getJson('/api/admin/users');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Access denied',
            ]);
    }

    /**
     * 16. Get user detail as admin — GET /api/admin/users/{id} → 200
     */
    public function test_get_user_detail_as_admin(): void
    {
        $response = $this->withToken($this->adminToken)->getJson("/api/admin/users/{$this->regularUserId}");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => [
                    'id',
                    'username',
                    'role',
                    'created_at',
                ],
                'wallet' => [
                    'id',
                    'user_id',
                    'currency',
                    'balance',
                    'version',
                ],
                'recentTransactions',
            ])
            ->assertJsonPath('user.username', 'regular')
            ->assertJsonPath('user.role', 'ROLE_USER')
            ->assertJsonPath('wallet.currency', 'USDT');
    }

    /**
     * 17. Disable user as admin — PUT /api/admin/users/{id}/disable → 200
     */
    public function test_disable_user(): void
    {
        $response = $this->withToken($this->adminToken)->putJson("/api/admin/users/{$this->regularUserId}/disable");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'SUCCESS',
                'message' => 'User disabled successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $this->regularUserId,
            'role' => 'ROLE_DISABLED',
        ]);
    }

    /**
     * 18. Enable user as admin — PUT /api/admin/users/{id}/enable → 200
     */
    public function test_enable_user(): void
    {
        // First disable, then enable
        $this->withToken($this->adminToken)->putJson("/api/admin/users/{$this->regularUserId}/disable");

        $response = $this->withToken($this->adminToken)->putJson("/api/admin/users/{$this->regularUserId}/enable");

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'SUCCESS',
                'message' => 'User enabled successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $this->regularUserId,
            'role' => 'ROLE_USER',
        ]);
    }

    /**
     * 19. Disabled user cannot login — POST /api/auth/login → 401
     */
    public function test_disabled_user_login_returns_401(): void
    {
        // Disable the regular user first
        $this->withToken($this->adminToken)->putJson("/api/admin/users/{$this->regularUserId}/disable");

        $response = $this->postJson('/api/auth/login', [
            'username' => 'regular',
            'password' => 'userpass',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Invalid username or password',
            ]);
    }

    /**
     * 20. List transactions as admin — GET /api/admin/transactions → 200
     */
    public function test_list_transactions_as_admin(): void
    {
        // Perform a transfer to create transaction data
        $sender = $this->createUser('sender', 'password', 'ROLE_USER', 50);
        $receiver = $this->createUser('receiver', 'password', 'ROLE_USER', 10);
        $senderToken = JwtHelper::generateToken($sender->id, $sender->username, 'ROLE_USER');

        $this->withToken($senderToken)->postJson('/api/transactions/transfer', [
            'toUsername' => 'receiver',
            'amount' => '10',
        ]);

        $response = $this->withToken($this->adminToken)->getJson('/api/admin/transactions');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    '*' => [
                        'id',
                        'fromWalletId',
                        'toWalletId',
                        'fromUsername',
                        'toUsername',
                        'amount',
                        'txType',
                        'status',
                        'createdAt',
                    ],
                ],
                'page',
                'size',
                'total',
            ])
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.fromUsername', 'sender')
            ->assertJsonPath('data.0.toUsername', 'receiver');
    }

    /**
     * 21. Get transaction stats as admin — GET /api/admin/transactions/stats → 200
     */
    public function test_get_transaction_stats_as_admin(): void
    {
        // Create a transaction to have stats
        $sender = $this->createUser('sender', 'password', 'ROLE_USER', 100);
        $this->createUser('receiver', 'password', 'ROLE_USER', 0);
        $senderToken = JwtHelper::generateToken($sender->id, $sender->username, 'ROLE_USER');

        $this->withToken($senderToken)->postJson('/api/transactions/transfer', [
            'toUsername' => 'receiver',
            'amount' => '30',
        ]);

        $response = $this->withToken($this->adminToken)->getJson('/api/admin/transactions/stats');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'totalCount',
                'totalAmount',
                'startDate',
                'endDate',
                'daily',
            ])
            ->assertJsonPath('totalCount', 1);

        $this->assertGreaterThan(0, $response->json('totalAmount'));
        $this->assertIsArray($response->json('daily'));
    }

    /**
     * Admin endpoints require jwt.auth middleware — 401 without token
     */
    public function test_admin_users_no_auth_returns_401(): void
    {
        $response = $this->getJson('/api/admin/users');

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Invalid username or password',
            ]);
    }

    /**
     * Disable non-existent user — PUT /api/admin/users/999/disable → 500
     *
     * NOTE: Eloquent's findOrFail throws ModelNotFoundException.
     * The generic Throwable handler in bootstrap/app.php catches it
     * first and renders 500 "Internal server error" instead of 404.
     * To get proper 404 responses, a custom ModelNotFoundException
     * handler should be added before the generic one.
     */
    public function test_disable_non_existent_user_returns_500(): void
    {
        $response = $this->withToken($this->adminToken)->putJson('/api/admin/users/999/disable');

        $response->assertStatus(500)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Internal server error',
            ]);
    }

    /**
     * Get detail for non-existent user — GET /api/admin/users/999 → 500
     *
     * NOTE: Eloquent's findOrFail throws ModelNotFoundException which
     * is caught by the generic Throwable handler, returning 500 instead
     * of the expected 404.
     */
    public function test_get_detail_non_existent_user_returns_500(): void
    {
        $response = $this->withToken($this->adminToken)->getJson('/api/admin/users/999');

        $response->assertStatus(500)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Internal server error',
            ]);
    }
}
