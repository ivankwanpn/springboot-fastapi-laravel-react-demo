const { Router } = require('express');
const walletService = require('../services/walletService');
const auth = require('../middleware/auth');

const router = Router();

router.get('/', auth, async (req, res, next) => {
  try {
    const wallet = await walletService.getByUserId(req.userId);
    res.json(wallet);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
