const pool = require('../config/db');
const AppError = require('../utils/AppError');

async function listUsers(search, page, size) {
  const clampedSize = Math.min(100, Math.max(1, size || 20));
  const offset = (Math.max(1, page || 1) - 1) * clampedSize;
  const searchPattern = `%${search || ''}%`;

  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS total FROM users WHERE username ILIKE $1',
    [searchPattern]
  );

  const result = await pool.query(
    'SELECT id, username, role, created_at AS "createdAt" FROM users WHERE username ILIKE $1 ORDER BY id LIMIT $2 OFFSET $3',
    [searchPattern, clampedSize, offset]
  );

  return {
    data: result.rows.map(u => ({
      id: parseInt(u.id, 10),
      username: u.username,
      role: u.role,
      createdAt: u.createdAt,
    })),
    total: countResult.rows[0].total,
    page: Math.max(1, page || 1),
    size: clampedSize,
  };
}

async function getUserDetail(userId) {
  const userResult = await pool.query(
    'SELECT id, username, role, created_at AS "createdAt" FROM users WHERE id = $1',
    [userId]
  );
  const user = userResult.rows[0];
  if (!user) {
    throw new AppError(404, 'User not found: ' + userId);
  }

  const walletResult = await pool.query(
    'SELECT id, user_id AS "userId", currency, balance, version, updated_at AS "updatedAt" FROM wallets WHERE user_id = $1',
    [userId]
  );

  let transactions = [];
  if (walletResult.rows[0]) {
    const txResult = await pool.query(
      'SELECT id, from_wallet_id AS "fromWalletId", to_wallet_id AS "toWalletId", amount, tx_type AS "txType", status, created_at AS "createdAt" FROM transactions WHERE from_wallet_id = $1 OR to_wallet_id = $1 ORDER BY created_at DESC LIMIT 5',
      [walletResult.rows[0].id]
    );
    transactions = txResult.rows.map(tx => ({
      id: parseInt(tx.id, 10),
      fromWalletId: tx.fromWalletId ? parseInt(tx.fromWalletId, 10) : null,
      toWalletId: tx.toWalletId ? parseInt(tx.toWalletId, 10) : null,
      amount: parseFloat(tx.amount),
      txType: tx.txType,
      status: tx.status,
      createdAt: tx.createdAt,
    }));
  }

  return {
    id: parseInt(user.id, 10),
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    wallet: walletResult.rows[0] ? {
      id: parseInt(walletResult.rows[0].id, 10),
      userId: parseInt(walletResult.rows[0].userId, 10),
      currency: walletResult.rows[0].currency,
      balance: parseFloat(walletResult.rows[0].balance),
      version: parseInt(walletResult.rows[0].version, 10),
      updatedAt: walletResult.rows[0].updatedAt,
    } : null,
    recentTransactions: transactions,
  };
}

async function disableUser(userId) {
  const check = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (check.rows.length === 0) {
    throw new AppError(404, 'User not found: ' + userId);
  }
  await pool.query("UPDATE users SET role = 'ROLE_DISABLED' WHERE id = $1", [userId]);
}

async function enableUser(userId) {
  const check = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (check.rows.length === 0) {
    throw new AppError(404, 'User not found: ' + userId);
  }
  await pool.query("UPDATE users SET role = 'ROLE_USER' WHERE id = $1", [userId]);
}

async function listTransactions(username, fromDate, toDate, page, size) {
  const clampedSize = Math.min(100, Math.max(1, size || 20));
  const offset = (Math.max(1, page || 1) - 1) * clampedSize;

  let conditions = [];
  let params = [];
  let paramIndex = 1;

  if (username) {
    conditions.push('(fu.username ILIKE $' + paramIndex + ' OR tu.username ILIKE $' + paramIndex + ')');
    params.push('%' + username + '%');
    paramIndex++;
  }

  if (fromDate) {
    conditions.push('t.created_at >= $' + paramIndex);
    params.push(fromDate);
    paramIndex++;
  }

  if (toDate) {
    conditions.push("t.created_at < $" + paramIndex + "::date + INTERVAL '1 day'");
    params.push(toDate);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await pool.query(
    'SELECT COUNT(*)::int AS total FROM transactions t LEFT JOIN wallets fw ON t.from_wallet_id = fw.id LEFT JOIN users fu ON fw.user_id = fu.id LEFT JOIN wallets tw ON t.to_wallet_id = tw.id LEFT JOIN users tu ON tw.user_id = tu.id ' + whereClause,
    params
  );

  const result = await pool.query(
    'SELECT t.id, t.from_wallet_id AS "fromWalletId", t.to_wallet_id AS "toWalletId", t.amount, t.tx_type AS "txType", t.status, t.created_at AS "createdAt", fu.username AS "fromUsername", tu.username AS "toUsername" FROM transactions t LEFT JOIN wallets fw ON t.from_wallet_id = fw.id LEFT JOIN users fu ON fw.user_id = fu.id LEFT JOIN wallets tw ON t.to_wallet_id = tw.id LEFT JOIN users tu ON tw.user_id = tu.id ' + whereClause + ' ORDER BY t.created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1),
    [...params, clampedSize, offset]
  );

  return {
    data: result.rows.map(tx => ({
      id: parseInt(tx.id, 10),
      fromWalletId: tx.fromWalletId ? parseInt(tx.fromWalletId, 10) : null,
      toWalletId: tx.toWalletId ? parseInt(tx.toWalletId, 10) : null,
      fromUsername: tx.fromUsername || null,
      toUsername: tx.toUsername || null,
      amount: parseFloat(tx.amount),
      txType: tx.txType,
      status: tx.status,
      createdAt: tx.createdAt,
    })),
    total: countResult.rows[0].total,
    page: Math.max(1, page || 1),
    size: clampedSize,
  };
}

async function getTransactionStats(fromDate, toDate) {
  let conditions = [];
  let params = [];

  if (fromDate) {
    conditions.push('created_at >= $' + (params.length + 1));
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push("created_at < $" + (params.length + 1) + "::date + INTERVAL '1 day'");
    params.push(toDate);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const summaryResult = await pool.query(
    'SELECT COUNT(*)::bigint AS total, COALESCE(SUM(amount), 0) AS amount FROM transactions ' + whereClause,
    params
  );

  const detailResult = await pool.query(
    'SELECT DATE(created_at) as date, COUNT(*)::bigint as count, COALESCE(SUM(amount), 0) as amount FROM transactions ' + whereClause + ' GROUP BY DATE(created_at) ORDER BY date',
    params
  );

  return {
    totalTransactions: parseInt(summaryResult.rows[0].total, 10),
    totalAmount: parseFloat(summaryResult.rows[0].amount),
    dailyVolume: detailResult.rows.map(d => ({
      date: d.date,
      count: parseInt(d.count, 10),
      amount: parseFloat(d.amount),
    })),
  };
}

module.exports = { listUsers, getUserDetail, disableUser, enableUser, listTransactions, getTransactionStats };
