<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 9. Transfer successfully — POST /api/transactions/transfer → 200
     */
    public function test_transfer_successfully(): void
    {
        $sender = $this->createUser('sender', 'password123', 'ROLE_USER', 100);
        $receiver = $this->createUser('receiver', 'password123', 'ROLE_USER', 0);

        $token = $this->getToken($sender->id, $sender->username);

        $response = $this->withToken($token)->postJson('/api/transactions/transfer', [
            'toUsername' => 'receiver',
            'amount' => '50',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'SUCCESS',
                'message' => 'Transfer completed successfully',
            ]);

        $this->assertDatabaseHas('wallets', [
            'user_id' => $sender->id,
            'balance' => '50.0000',
            'version' => 1,
        ]);

        $this->assertDatabaseHas('wallets', [
            'user_id' => $receiver->id,
            'balance' => '50.0000',
        ]);

        $this->assertDatabaseHas('transactions', [
            'from_wallet_id' => $sender->wallet->id,
            'to_wallet_id' => $receiver->wallet->id,
            'amount' => '50.0000',
            'tx_type' => 'TRANSFER',
            'status' => 'SUCCESS',
        ]);
    }

    /**
     * 10. Transfer with insufficient balance — POST /api/transactions/transfer → 400
     */
    public function test_transfer_insufficient_balance_returns_400(): void
    {
        $sender = $this->createUser('sender', 'password123', 'ROLE_USER', 10);
        $receiver = $this->createUser('receiver', 'password123', 'ROLE_USER', 0);

        $token = $this->getToken($sender->id, $sender->username);

        $response = $this->withToken($token)->postJson('/api/transactions/transfer', [
            'toUsername' => 'receiver',
            'amount' => '100',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Insufficient balance: 10.0000 < 100',
            ]);
    }

    /**
     * 11. Transfer to self — POST /api/transactions/transfer → 400
     */
    public function test_transfer_to_self_returns_400(): void
    {
        $user = $this->createUser('testuser', 'password123', 'ROLE_USER', 100);

        $token = $this->getToken($user->id, $user->username);

        $response = $this->withToken($token)->postJson('/api/transactions/transfer', [
            'toUsername' => 'testuser',
            'amount' => '50',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Cannot transfer to yourself',
            ]);
    }

    /**
     * 12. Transfer to non-existent user — POST /api/transactions/transfer → 400
     */
    public function test_transfer_to_non_existent_user_returns_400(): void
    {
        $sender = $this->createUser('sender', 'password123', 'ROLE_USER', 100);

        $token = $this->getToken($sender->id, $sender->username);

        $response = $this->withToken($token)->postJson('/api/transactions/transfer', [
            'toUsername' => 'nonexistent',
            'amount' => '50',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Recipient not found: nonexistent',
            ]);
    }

    /**
     * 12b. Transfer with zero amount — POST /api/transactions/transfer → 400
     */
    public function test_transfer_zero_amount_returns_400(): void
    {
        $sender = $this->createUser('sender', 'password123', 'ROLE_USER', 100);
        $this->createUser('receiver', 'password123', 'ROLE_USER', 0);

        $token = $this->getToken($sender->id, $sender->username);

        $response = $this->withToken($token)->postJson('/api/transactions/transfer', [
            'toUsername' => 'receiver',
            'amount' => '0',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Transfer amount must be greater than zero',
            ]);
    }

    /**
     * 13. Get transaction history — GET /api/transactions → 200
     */
    public function test_transaction_history(): void
    {
        $sender = $this->createUser('sender', 'password123', 'ROLE_USER', 100);
        $receiver = $this->createUser('receiver', 'password123', 'ROLE_USER', 0);

        // Perform a transfer so there is history to query
        $token = $this->getToken($sender->id, $sender->username);
        $this->withToken($token)->postJson('/api/transactions/transfer', [
            'toUsername' => 'receiver',
            'amount' => '25',
        ]);

        $response = $this->withToken($token)->getJson('/api/transactions');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment([
                'amount' => 25,
                'txType' => 'TRANSFER',
                'status' => 'SUCCESS',
                'fromWalletId' => $sender->wallet->id,
                'toWalletId' => $receiver->wallet->id,
            ]);
    }

    /**
     * 13b. Transaction history without auth — GET /api/transactions → 401
     */
    public function test_transaction_history_no_auth_returns_401(): void
    {
        $response = $this->getJson('/api/transactions');

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
            ]);
    }

    /**
     * Transfer without auth — POST /api/transactions/transfer → 401
     */
    public function test_transfer_no_auth_returns_401(): void
    {
        $response = $this->postJson('/api/transactions/transfer', [
            'toUsername' => 'receiver',
            'amount' => '50',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
            ]);
    }
}
