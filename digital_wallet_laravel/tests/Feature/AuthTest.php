<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /**
     * 1. Register successfully — POST /api/auth/register → 201
     */
    public function test_register_successfully(): void
    {
        $username = uniqid('user_');

        $response = $this->postJson('/api/auth/register', [
            'username' => $username,
            'password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'SUCCESS',
                'message' => 'User registered successfully',
            ]);

        $this->assertDatabaseHas('users', [
            'username' => $username,
            'role' => 'ROLE_USER',
        ]);

        $user = \App\Models\User::where('username', $username)->first();
        $this->assertNotNull($user);

        $this->assertDatabaseHas('wallets', [
            'user_id' => $user->id,
            'currency' => 'USDT',
        ]);
    }

    /**
     * 2. Register with duplicate username — POST /api/auth/register → 409
     */
    public function test_register_duplicate_username_returns_409(): void
    {
        $this->createUser('testuser', 'password123');

        $response = $this->postJson('/api/auth/register', [
            'username' => 'testuser',
            'password' => 'password123',
        ]);

        $response->assertStatus(409)
            ->assertJson([
                'status' => 'ERROR',
                'message' => "Username 'testuser' is already taken",
            ]);
    }

    /**
     * 3. Register with empty username — POST /api/auth/register → 400
     */
    public function test_register_empty_username_returns_400(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'username' => '',
            'password' => 'password123',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
            ]);
    }

    /**
     * 3b. Register with missing username field — POST /api/auth/register → 400
     */
    public function test_register_missing_username_returns_400(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'password' => 'password123',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
            ]);
    }

    /**
     * 3c. Register with short password — POST /api/auth/register → 400
     */
    public function test_register_short_password_returns_400(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'username' => 'testuser',
            'password' => '12',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
            ]);
    }

    /**
     * 4. Login successfully — POST /api/auth/login → 200 with token JSON structure
     */
    public function test_login_successfully(): void
    {
        $this->createUser('testuser', 'password123');

        $response = $this->postJson('/api/auth/login', [
            'username' => 'testuser',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'token',
                'user' => [
                    'id',
                    'username',
                    'role',
                    'createdAt',
                ],
            ])
            ->assertJsonPath('user.username', 'testuser')
            ->assertJsonPath('user.role', 'ROLE_USER');

        $this->assertNotEmpty($response->json('token'));
    }

    /**
     * 5. Login with wrong password — POST /api/auth/login → 401
     */
    public function test_login_wrong_password_returns_401(): void
    {
        $this->createUser('testuser', 'password123');

        $response = $this->postJson('/api/auth/login', [
            'username' => 'testuser',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Invalid username or password',
            ]);
    }

    /**
     * 6. Login with non-existent username — POST /api/auth/login → 401
     */
    public function test_login_non_existent_user_returns_401(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'username' => 'nobody',
            'password' => 'password123',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'ERROR',
                'message' => 'Invalid username or password',
            ]);
    }

    /**
     * 6b. Login with missing username — POST /api/auth/login → 400
     */
    public function test_login_missing_username_returns_400(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'password' => 'password123',
        ]);

        $response->assertStatus(400)
            ->assertJson([
                'status' => 'ERROR',
            ]);
    }
}
