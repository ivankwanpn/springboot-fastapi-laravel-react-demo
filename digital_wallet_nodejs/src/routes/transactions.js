const { Router } = require('express');
const { validationResult } = require('express-validator');
const transactionService = require('../services/transactionService');
const { transferRules } = require('../validators/transferValidator');
const auth = require('../middleware/auth');
const AppError = require('../utils/AppError');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(400, errors.array()[0].msg));
  }
  next();
}

router.post('/transfer', auth, transferRules, validate, async (req, res, next) => {
  try {
    await transactionService.transfer(req.userId, req.body.toUsername, req.body.amount);
    res.json({ status: 'SUCCESS', message: 'Transfer completed successfully' });
  } catch (err) {
    next(err);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const history = await transactionService.getHistory(req.userId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
