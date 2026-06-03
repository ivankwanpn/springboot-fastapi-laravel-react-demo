const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRATION = parseInt(process.env.JWT_EXPIRATION || '86400000', 10);

function generateToken(userId, username, role) {
  return jwt.sign(
    { sub: String(userId), username, role },
    SECRET,
    { algorithm: 'HS256', expiresIn: EXPIRATION / 1000 }
  );
}

function verifyToken(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}

function extractUserId(token) {
  const payload = verifyToken(token);
  return parseInt(payload.sub, 10);
}

module.exports = { generateToken, verifyToken, extractUserId };
