import express from 'express';
import { body, param } from 'express-validator';
import expenseController from '../controllers/expense.controller.js';

const router = express.Router();

// GET /expenses
router.get('/', expenseController.getAllExpenses);

// POST /expenses
router.post(
    '/',
    [
        body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
        body('description').notEmpty().withMessage('Description is required'),
        body('paid_by').notEmpty().withMessage('Paid by is required')
    ],
    expenseController.createExpense
);

// PUT /expenses/:id
router.put(
    '/:id',
    [
        param('id').isUUID().withMessage('Invalid expense ID'),
        body('amount').optional().isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
        body('description').optional().notEmpty().withMessage('Description cannot be empty'),
        body('paid_by').optional().notEmpty().withMessage('Paid by cannot be empty')
    ],
    expenseController.updateExpense
);

// DELETE /expenses/:id
router.delete(
    '/:id',
    [
        param('id').isUUID().withMessage('Invalid expense ID')
    ],
    expenseController.deleteExpense
);

// GET /people
router.get('/people', expenseController.getAllPeople);

export default router;