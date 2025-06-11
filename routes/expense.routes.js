
import express from 'express';
import { body, param } from 'express-validator';
import expenseController from '../controllers/expense.controller.js';

const router = express.Router();

router.get('/', expenseController.getAllExpenses);

router.post(
    '/',
    [
        body('amount')
            .isFloat({ min: 0.01 })
            .withMessage('Amount must be a positive number')
            .toFloat(),
        body('description')
            .trim()
            .notEmpty()
            .withMessage('Description is required')
            .isLength({ min: 1, max: 255 })
            .withMessage('Description must be between 1 and 255 characters'),
        body('paid_by')
            .trim()
            .notEmpty()
            .withMessage('Paid by is required'),
        body('participants')
            .optional()
            .isArray()
            .withMessage('Participants must be an array'),
        body('shareType')
            .optional()
            .isIn(['EQUAL', 'EXACT', 'PERCENTAGE'])
            .withMessage('Share type must be EQUAL, EXACT, or PERCENTAGE'),
        body('customShares')
            .optional()
            .isObject()
            .withMessage('Custom shares must be an object')
    ],
    expenseController.createExpense
);

// PUT /expenses/:id
router.put(
    '/:id',
    [
        param('id')
            .notEmpty()
            .withMessage('Expense ID is required'),
        body('amount')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('Amount must be a positive number')
            .toFloat(),
        body('description')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Description cannot be empty')
            .isLength({ min: 1, max: 255 })
            .withMessage('Description must be between 1 and 255 characters'),
        body('paid_by')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Paid by cannot be empty'),
        body('participants')
            .optional()
            .isArray()
            .withMessage('Participants must be an array'),
        body('shareType')
            .optional()
            .isIn(['EQUAL', 'EXACT', 'PERCENTAGE'])
            .withMessage('Share type must be EQUAL, EXACT, or PERCENTAGE'),
        body('customShares')
            .optional()
            .isObject()
            .withMessage('Custom shares must be an object')
    ],
    expenseController.updateExpense
);

router.delete(
    '/:id',
    [
        param('id')
            .notEmpty()
            .withMessage('Expense ID is required')
    ],
    expenseController.deleteExpense
);

router.get('/people', expenseController.getAllPeople);

export default router;
