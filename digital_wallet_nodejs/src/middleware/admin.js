const AppError = require('../utils/AppError');

function adminMiddleware(req, res, next) {
  if (req.userRole !== 'ROLE_ADMIN') {
    return next(new AppError(403, 'Access denied'));
  }
  next();
}

module.exports = adminMiddleware;
