const pool = require('../config/db');
const AppError = require('../utils/AppError');

async function getByUserId(userId) {
  const result = await pool.query(
    'SELECT id, user_id AS "userId", currency, balance, version, updated_at AS "updatedAt" FROM wallets WHERE user_id = $1',
    [userId]
  );
  const wallet = result.rows[0];

  if (!wallet) {
    throw new AppError(404, `Wallet not found for userId: ${userId}`);
  }

  return {
    id: parseInt(wallet.id, 10),
    userId: parseInt(wallet.userId, 10),
    currency: wallet.currency,
    balance: parseFloat(wallet.balance),
    version: parseInt(wallet.version, 10),
    updatedAt: wallet.updatedAt,
  };
}

module.exports = { getByUserId };
