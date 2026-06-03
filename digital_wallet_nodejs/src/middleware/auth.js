const { extractUserId, verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Invalid username or password'));
  }

  const token = header.substring(7);

  try {
    req.userId = extractUserId(token);
    const payload = verifyToken(token);
    req.userRole = payload.role || 'ROLE_USER';
    next();
  } catch (err) {
    next(new AppError(401, 'Invalid username or password'));
  }
}

module.exports = authMiddleware;
