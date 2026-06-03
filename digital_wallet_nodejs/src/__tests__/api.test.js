const request = require('supertest');
const app = require('../app');
const pool = require('../config/db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Register a user via the API and return the response.
 */
async function registerUser(username, password) {
  return request(app)
    .post('/api/auth/register')
    .send({ username, password });
}

/**
 * Login a user via the API and return the response (includes token).
 */
async function loginUser(username, password) {
  return request(app)
    .post('/api/auth/login')
    .send({ username, password });
}

/**
 * Register and immediately login – returns { userId, token, username, role }.
 */
async function createAndLogin(username, password) {
  await registerUser(username, password);
  const loginRes = await loginUser(username, password);
  return {
    token: loginRes.body.token,
    userId: loginRes.body.user.id,
    username: loginRes.body.user.username,
    role: loginRes.body.user.role,
  };
}

// Unique suffix so tests can run repeatedly without collisions against
// leftover data from previous runs.
const SUFFIX = `_${Date.now()}`;

// ---------------------------------------------------------------------------
// Global setup – create a dedicated admin user directly in the DB
// ---------------------------------------------------------------------------
let adminToken;
let adminUserId;

beforeAll(async () => {
  // Clean up any leftover test users from previous runs (best-effort)
  await pool.query("DELETE FROM users WHERE username LIKE $1", [`test_%${SUFFIX}`]);

  // Create an admin user directly so we can test admin endpoints
  const bcrypt = require('bcrypt');
  const hash = await bcrypt.hash('adminpass', 12);
  const adminResult = await pool.query(
    "INSERT INTO users(username, password_hash, role) VALUES($1, $2, $3) ON CONFLICT (username) DO UPDATE SET role = 'ROLE_ADMIN' RETURNING id, username, role",
    [`admin_test${SUFFIX}`, hash, 'ROLE_ADMIN']
  );
  adminUserId = parseInt(adminResult.rows[0].id, 10);

  // Ensure the admin has a wallet
  await pool.query(
    "INSERT INTO wallets(user_id, currency, balance, version) VALUES($1, 'USDT', '1000000', 0) ON CONFLICT DO NOTHING",
    [adminUserId]
  );

  // Login to get admin token
  const adminLoginRes = await loginUser(`admin_test${SUFFIX}`, 'adminpass');
  adminToken = adminLoginRes.body.token;
});

afterAll(async () => {
  // Clean up test data
  await pool.query("DELETE FROM users WHERE username LIKE $1", [`test_%${SUFFIX}`]);
  await pool.query("DELETE FROM users WHERE username = $1", [`admin_test${SUFFIX}`]);
  await pool.end();
});

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------
describe('POST /api/auth/register', () => {
  it('should register a new user and return 201', async () => {
    const res = await registerUser(`test_user_a${SUFFIX}`, 'password123');
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.message).toMatch(/successfully/i);
  });

  it('should return 409 when registering a duplicate username', async () => {
    const username = `test_dup${SUFFIX}`;
    // First registration succeeds
    await registerUser(username, 'password123');
    // Duplicate
    const res = await registerUser(username, 'password123');
    expect(res.status).toBe(409);
    expect(res.body.status).toBe('ERROR');
    expect(res.body.message).toMatch(/already taken/i);
  });

  it('should return 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'pass123' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('ERROR');
  });

  it('should return 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: `test_nopass${SUFFIX}` });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('should login and return a token with user object', async () => {
    const username = `test_user_login${SUFFIX}`;
    await registerUser(username, 'securepass');

    const res = await loginUser(username, 'securepass');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({
      username,
      role: 'ROLE_USER',
    });
    expect(res.body.user).toHaveProperty('id');
  });

  it('should return 401 for wrong password', async () => {
    const username = `test_wrongpw${SUFFIX}`;
    await registerUser(username, 'correct');

    const res = await loginUser(username, 'wrongpassword');
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('ERROR');
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('should return 401 for non-existent user', async () => {
    const res = await loginUser(`nonexistent${SUFFIX}`, 'any');
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('ERROR');
  });

  it('should return 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'pass' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('ERROR');
  });
});

// ---------------------------------------------------------------------------
// Wallet endpoints
// ---------------------------------------------------------------------------
describe('GET /api/wallets', () => {
  it('should return the wallet for an authenticated user', async () => {
    const { token } = await createAndLogin(`test_wallet_ok${SUFFIX}`, 'pass');

    const res = await request(app)
      .get('/api/wallets')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('userId');
    expect(res.body).toHaveProperty('currency');
    expect(res.body).toHaveProperty('balance');
    expect(res.body).toHaveProperty('version');
    expect(res.body.currency).toBe('USDT');
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/wallets');
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('ERROR');
  });

  it('should return 401 when token is malformed', async () => {
    const res = await request(app)
      .get('/api/wallets')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('ERROR');
  });

  it('should return 401 when header uses wrong scheme', async () => {
    const res = await request(app)
      .get('/api/wallets')
      .set('Authorization', 'Basic abc123');
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('ERROR');
  });
});

// ---------------------------------------------------------------------------
// Transaction endpoints
// ---------------------------------------------------------------------------
describe('POST /api/transactions/transfer', () => {
  it('should transfer funds between two users', async () => {
    const sender = await createAndLogin(`test_sender_a${SUFFIX}`, 'pass');
    const receiver = await createAndLogin(`test_receiver_a${SUFFIX}`, 'pass');

    // Give sender some balance first (via admin's wallet or direct DB update)
    await pool.query(
      "UPDATE wallets SET balance = balance + 1000, version = version + 1 WHERE user_id = $1",
      [sender.userId]
    );

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ toUsername: receiver.username, amount: '250' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.message).toMatch(/successfully/i);

    // Verify receiver's balance increased
    const walletRes = await request(app)
      .get('/api/wallets')
      .set('Authorization', `Bearer ${receiver.token}`);
    expect(parseFloat(walletRes.body.balance)).toBeGreaterThanOrEqual(250);
  });

  it('should return 400 for insufficient balance', async () => {
    const sender = await createAndLogin(`test_poor${SUFFIX}`, 'pass');
    const receiver = await createAndLogin(`test_rich${SUFFIX}`, 'pass');

    // Sender starts with 0 balance
    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ toUsername: receiver.username, amount: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('ERROR');
    expect(res.body.message).toMatch(/insufficient/i);
  });

  it('should return 400 when transferring to yourself', async () => {
    const user = await createAndLogin(`test_self${SUFFIX}`, 'pass');

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ toUsername: user.username, amount: '10' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('ERROR');
    expect(res.body.message).toMatch(/yourself/i);
  });

  it('should return 404 when recipient does not exist', async () => {
    const sender = await createAndLogin(`test_sender_b${SUFFIX}`, 'pass');

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ toUsername: `completely_missing${SUFFIX}`, amount: '5' });

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('ERROR');
  });

  it('should return 400 when amount is zero or negative', async () => {
    const sender = await createAndLogin(`test_badamount${SUFFIX}`, 'pass');
    const receiver = await createAndLogin(`test_badamount_r${SUFFIX}`, 'pass');

    const res = await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ toUsername: receiver.username, amount: '0' });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('ERROR');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/transactions/transfer')
      .send({ toUsername: 'anyone', amount: '10' });

    expect(res.status).toBe(401);
    expect(res.body.status).toBe('ERROR');
  });
});

describe('GET /api/transactions', () => {
  it('should return transaction history for authenticated user', async () => {
    const sender = await createAndLogin(`test_hist_a${SUFFIX}`, 'pass');
    const receiver = await createAndLogin(`test_hist_b${SUFFIX}`, 'pass');

    // Add balance and do a transfer so there is at least one transaction
    await pool.query(
      "UPDATE wallets SET balance = balance + 500, version = version + 1 WHERE user_id = $1",
      [sender.userId]
    );
    await request(app)
      .post('/api/transactions/transfer')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({ toUsername: receiver.username, amount: '100' });

    const res = await request(app)
      .get('/api/transactions')
      .set('Authorization', `Bearer ${sender.token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('amount');
    expect(res.body[0]).toHaveProperty('txType');
    expect(res.body[0]).toHaveProperty('status');
  });

  it('should return 401 without auth', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(401);
    expect(res.body.status).toBe('ERROR');
  });
});

// ---------------------------------------------------------------------------
// Admin endpoints
// ---------------------------------------------------------------------------
describe('Admin endpoints', () => {
  // -- GET /api/admin/users
  describe('GET /api/admin/users', () => {
    it('should list users when called as admin', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page');
      expect(res.body).toHaveProperty('size');
    });

    it('should support search query parameter', async () => {
      const res = await request(app)
        .get(`/api/admin/users?search=admin_test${SUFFIX}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.some(u => u.username === `admin_test${SUFFIX}`)).toBe(true);
    });

    it('should return 403 when called as regular user', async () => {
      const { token } = await createAndLogin(`test_no_admin${SUFFIX}`, 'pass');

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('ERROR');
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
      expect(res.body.status).toBe('ERROR');
    });
  });

  // -- GET /api/admin/users/:id
  describe('GET /api/admin/users/:id', () => {
    it('should return user detail with wallet and recent transactions', async () => {
      const regularUser = await createAndLogin(`test_detail${SUFFIX}`, 'pass');

      const res = await request(app)
        .get(`/api/admin/users/${regularUser.userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.username).toBe(regularUser.username);
      expect(res.body).toHaveProperty('wallet');
      expect(res.body).toHaveProperty('recentTransactions');
      expect(Array.isArray(res.body.recentTransactions)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const res = await request(app)
        .get('/api/admin/users/99999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('ERROR');
    });
  });

  // -- PUT /api/admin/users/:id/disable
  describe('PUT /api/admin/users/:id/disable', () => {
    it('should disable a user', async () => {
      const user = await createAndLogin(`test_disable${SUFFIX}`, 'pass');

      const res = await request(app)
        .put(`/api/admin/users/${user.userId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.message).toMatch(/disabled/i);
    });

    it('should return 404 when disabling a non-existent user', async () => {
      const res = await request(app)
        .put('/api/admin/users/99999999/disable')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('ERROR');
    });
  });

  // -- PUT /api/admin/users/:id/enable
  describe('PUT /api/admin/users/:id/enable', () => {
    it('should enable a previously disabled user', async () => {
      const user = await createAndLogin(`test_enable${SUFFIX}`, 'pass');

      // First disable
      await request(app)
        .put(`/api/admin/users/${user.userId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Then enable
      const res = await request(app)
        .put(`/api/admin/users/${user.userId}/enable`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.message).toMatch(/enabled/i);
    });
  });

  // -- Disabled user cannot login
  describe('Disabled user login behaviour', () => {
    it('should prevent a disabled user from logging in', async () => {
      const user = await createAndLogin(`test_blocked${SUFFIX}`, 'pass');

      // Disable the user
      await request(app)
        .put(`/api/admin/users/${user.userId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Attempt login
      const loginRes = await loginUser(user.username, 'pass');
      expect(loginRes.status).toBe(401);
      expect(loginRes.body.status).toBe('ERROR');
    });

    it('should allow a re-enabled user to login', async () => {
      const user = await createAndLogin(`test_reenable${SUFFIX}`, 'pass');

      // Disable
      await request(app)
        .put(`/api/admin/users/${user.userId}/disable`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Re-enable
      await request(app)
        .put(`/api/admin/users/${user.userId}/enable`)
        .set('Authorization', `Bearer ${adminToken}`);

      // Should be able to login now
      const loginRes = await loginUser(user.username, 'pass');
      expect(loginRes.status).toBe(200);
      expect(loginRes.body).toHaveProperty('token');
    });
  });

  // -- GET /api/admin/transactions
  describe('GET /api/admin/transactions', () => {
    it('should list all transactions as admin', async () => {
      const res = await request(app)
        .get('/api/admin/transactions')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty('total');
    });

    it('should support username filter', async () => {
      // Create a user and do a transfer so we can search by their username
      const sender = await createAndLogin(`test_filter${SUFFIX}`, 'pass');
      const receiver = await createAndLogin(`test_filter_r${SUFFIX}`, 'pass');
      await pool.query(
        "UPDATE wallets SET balance = balance + 100, version = version + 1 WHERE user_id = $1",
        [sender.userId]
      );
      await request(app)
        .post('/api/transactions/transfer')
        .set('Authorization', `Bearer ${sender.token}`)
        .send({ toUsername: receiver.username, amount: '50' });

      const res = await request(app)
        .get(`/api/admin/transactions?username=${sender.username}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 for non-admin user', async () => {
      const { token } = await createAndLogin(`test_noadmin_tx${SUFFIX}`, 'pass');

      const res = await request(app)
        .get('/api/admin/transactions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  // -- GET /api/admin/transactions/stats
  describe('GET /api/admin/transactions/stats', () => {
    it('should return transaction statistics', async () => {
      const res = await request(app)
        .get('/api/admin/transactions/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalTransactions');
      expect(res.body).toHaveProperty('totalAmount');
      expect(res.body).toHaveProperty('dailyVolume');
      expect(Array.isArray(res.body.dailyVolume)).toBe(true);
    });

    it('should support date range filters', async () => {
      const res = await request(app)
        .get('/api/admin/transactions/stats?from=2020-01-01&to=2030-12-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalTransactions');
      expect(res.body).toHaveProperty('totalAmount');
    });

    it('should return 403 for non-admin user', async () => {
      const { token } = await createAndLogin(`test_noadmin_stats${SUFFIX}`, 'pass');

      const res = await request(app)
        .get('/api/admin/transactions/stats')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
