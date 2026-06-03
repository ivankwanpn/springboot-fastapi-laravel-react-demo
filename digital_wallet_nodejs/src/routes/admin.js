const { Router } = require('express');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const adminService = require('../services/adminService');
const router = Router();

router.use(auth, admin);

router.get('/users', async (req, res, next) => {
  try {
    const { search = '', page = 1, size = 20 } = req.query;
    const result = await adminService.listUsers(search, parseInt(page), parseInt(size));
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/users/:id', async (req, res, next) => {
  try {
    const detail = await adminService.getUserDetail(parseInt(req.params.id));
    res.json(detail);
  } catch (err) { next(err); }
});

router.put('/users/:id/disable', async (req, res, next) => {
  try {
    await adminService.disableUser(parseInt(req.params.id));
    res.json({ status: 'SUCCESS', message: 'User disabled successfully' });
  } catch (err) { next(err); }
});

router.put('/users/:id/enable', async (req, res, next) => {
  try {
    await adminService.enableUser(parseInt(req.params.id));
    res.json({ status: 'SUCCESS', message: 'User enabled successfully' });
  } catch (err) { next(err); }
});

router.get('/transactions', async (req, res, next) => {
  try {
    const { username, from, to, page = 1, size = 20 } = req.query;
    const result = await adminService.listTransactions(username || '', from || '', to || '', parseInt(page), parseInt(size));
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/transactions/stats', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const result = await adminService.getTransactionStats(from || '', to || '');
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
