const { body } = require('express-validator');

const transferRules = [
  body('toUsername').trim().notEmpty().withMessage('Recipient username is required'),
  body('amount')
    .trim()
    .notEmpty().withMessage('Amount is required')
    .matches(/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/).withMessage('Invalid amount format'),
];

module.exports = { transferRules };
