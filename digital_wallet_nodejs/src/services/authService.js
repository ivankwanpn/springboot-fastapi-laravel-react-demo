const bcrypt = require('bcrypt');
const pool = require('../config/db');
const { generateToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

async function register(username, password) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash(password, 12);

    let user;
    try {
      const result = await client.query(
        'INSERT INTO users(username, password_hash, role) VALUES($1, $2, $3) RETURNING id, username, role, created_at AS "createdAt"',
        [username, passwordHash, 'ROLE_USER']
      );
      user = result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new AppError(409, `Username '${username}' is already taken`);
      }
      throw err;
    }

    await client.query(
      'INSERT INTO wallets(user_id, currency, balance, version) VALUES($1, $2, $3, $4)',
      [user.id, 'USDT', '0', 0]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function login(username, password) {
  const result = await pool.query(
    'SELECT id, username, password_hash AS "passwordHash", role, created_at AS "createdAt" FROM users WHERE username = $1',
    [username]
  );
  const user = result.rows[0];

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Invalid username or password');
  }

  if (user.role === 'ROLE_DISABLED') {
    throw new AppError(401, 'Invalid username or password');
  }

  const userId = parseInt(user.id, 10);
  const token = generateToken(userId, user.username, user.role);

  return {
    token,
    user: {
      id: userId,
      username: user.username,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

module.exports = { register, login };
