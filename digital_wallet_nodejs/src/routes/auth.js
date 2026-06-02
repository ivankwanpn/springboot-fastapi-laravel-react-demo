const { Router } = require('express');
const { validationResult } = require('express-validator');
const authService = require('../services/authService');
const { registerRules, loginRules } = require('../validators/authValidator');
const AppError = require('../utils/AppError');

const router = Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(400, errors.array()[0].msg));
  }
  next();
}

router.post('/register', registerRules, validate, async (req, res, next) => {
  try {
    await authService.register(req.body.username, req.body.password);
    res.status(201).json({ status: 'SUCCESS', message: 'User registered successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/login', loginRules, validate, async (req, res, next) => {
  try {
    const result = await authService.login(req.body.username, req.body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
