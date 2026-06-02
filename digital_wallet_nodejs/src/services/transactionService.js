const pool = require('../config/db');
const AppError = require('../utils/AppError');

async function transfer(fromUserId, toUsername, amount) {
  const amountDecimal = parseFloat(amount);
  if (isNaN(amountDecimal) || amountDecimal <= 0) {
    throw new AppError(400, 'Transfer amount must be greater than zero');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // lookup recipient
    const toUserResult = await client.query(
      'SELECT id FROM users WHERE username = $1', [toUsername]
    );
    const toUser = toUserResult.rows[0];
    if (!toUser) {
      throw new AppError(404, `Recipient not found: ${toUsername}`);
    }
    const toUserId = parseInt(toUser.id, 10);

    if (fromUserId === toUserId) {
      throw new AppError(400, 'Cannot transfer to yourself');
    }

    // read wallets
    const fromWalletResult = await client.query(
      'SELECT id, balance, version FROM wallets WHERE user_id = $1', [fromUserId]
    );
    const fromWallet = fromWalletResult.rows[0];
    if (!fromWallet) {
      throw new AppError(404, `Wallet not found for userId: ${fromUserId}`);
    }

    const toWalletResult = await client.query(
      'SELECT id FROM wallets WHERE user_id = $1', [toUserId]
    );
    const toWallet = toWalletResult.rows[0];
    if (!toWallet) {
      throw new AppError(404, `Wallet not found for userId: ${toUserId}`);
    }

    const balance = parseFloat(fromWallet.balance);
    if (balance < amountDecimal) {
      throw new AppError(400, `Insufficient balance: ${fromWallet.balance} < ${amount}`);
    }

    // optimistic lock deduct
    const deductResult = await client.query(
      `UPDATE wallets
       SET balance = balance - $1, version = version + 1, updated_at = NOW()
       WHERE user_id = $2 AND version = $3`,
      [amount, fromUserId, fromWallet.version]
    );
    if (deductResult.rowCount === 0) {
      throw new AppError(409, `Concurrent modification detected for userId: ${fromUserId}`);
    }

    // add balance
    await client.query(
      `UPDATE wallets
       SET balance = balance + $1, version = version + 1, updated_at = NOW()
       WHERE user_id = $2`,
      [amount, toUserId]
    );

    // record transaction
    await client.query(
      `INSERT INTO transactions(from_wallet_id, to_wallet_id, amount, tx_type, status)
       VALUES($1, $2, $3, $4, $5)`,
      [fromWallet.id, toWallet.id, amount, 'TRANSFER', 'SUCCESS']
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getHistory(userId) {
  const walletResult = await pool.query(
    'SELECT id FROM wallets WHERE user_id = $1', [userId]
  );
  const wallet = walletResult.rows[0];
  if (!wallet) {
    throw new AppError(404, `Wallet not found for userId: ${userId}`);
  }

  const result = await pool.query(
    `SELECT id, from_wallet_id AS "fromWalletId", to_wallet_id AS "toWalletId",
            amount, tx_type AS "txType", status, created_at AS "createdAt"
     FROM transactions
     WHERE from_wallet_id = $1 OR to_wallet_id = $1
     ORDER BY created_at DESC`,
    [wallet.id]
  );

  return result.rows.map(tx => ({
    id: parseInt(tx.id, 10),
    fromWalletId: tx.fromWalletId ? parseInt(tx.fromWalletId, 10) : null,
    toWalletId: tx.toWalletId ? parseInt(tx.toWalletId, 10) : null,
    amount: parseFloat(tx.amount),
    txType: tx.txType,
    status: tx.status,
    createdAt: tx.createdAt,
  }));
}

module.exports = { transfer, getHistory };
