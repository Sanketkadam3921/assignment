
// routes/expense.routes.js
import express from 'express';
import { body, param, query } from 'express-validator';
import expenseController from '../controllers/expense.controller.js';

const router = express.Router();

// ===== EXISTING ROUTES =====
// GET /expenses
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
            .withMessage('Custom shares must be an object'),
        body('category')
            .optional()
            .isIn(['FOOD', 'TRAVEL', 'UTILITIES', 'ENTERTAINMENT', 'RENT', 'TRANSPORT', 'SHOPPING', 'HEALTHCARE', 'EDUCATION', 'OTHER'])
            .withMessage('Invalid category')
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
            .withMessage('Custom shares must be an object'),
        body('category')
            .optional()
            .isIn(['FOOD', 'TRAVEL', 'UTILITIES', 'ENTERTAINMENT', 'RENT', 'TRANSPORT', 'SHOPPING', 'HEALTHCARE', 'EDUCATION', 'OTHER'])
            .withMessage('Invalid category')
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

// ===== NEW CATEGORY ROUTES =====
// GET /expenses/categories
router.get('/categories', expenseController.getExpenseCategories);

// GET /expenses/by-category
router.get('/by-category', expenseController.getExpensesByCategory);

// GET /expenses/category-summary
router.get('/category-summary', [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], expenseController.getCategorySummary);

// ===== NEW RECURRING EXPENSE ROUTES =====
// GET /recurring
router.get('/recurring', expenseController.getAllRecurringExpenses);

// POST /recurring
router.post(
    '/recurring',
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
            .withMessage('Custom shares must be an object'),
        body('category')
            .optional()
            .isIn(['FOOD', 'TRAVEL', 'UTILITIES', 'ENTERTAINMENT', 'RENT', 'TRANSPORT', 'SHOPPING', 'HEALTHCARE', 'EDUCATION', 'OTHER'])
            .withMessage('Invalid category'),
        body('frequency')
            .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
            .withMessage('Frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY'),
        body('startDate')
            .isISO8601()
            .withMessage('Start date must be a valid ISO date'),
        body('endDate')
            .optional()
            .isISO8601()
            .withMessage('End date must be a valid ISO date')
    ],
    expenseController.createRecurringExpense
);

// PUT /recurring/:id
router.put(
    '/recurring/:id',
    [
        param('id')
            .notEmpty()
            .withMessage('Recurring expense ID is required'),
        body('amount')
            .optional()
            .isFloat({ min: 0.01 })
            .withMessage('Amount must be a positive number')
            .toFloat(),
        body('description')
            .optional()
            .trim()
            .notEmpty()
            .withMessage('Description cannot be empty'),
        body('frequency')
            .optional()
            .isIn(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'])
            .withMessage('Frequency must be DAILY, WEEKLY, MONTHLY, or YEARLY'),
        body('isActive')
            .optional()
            .isBoolean()
            .withMessage('isActive must be a boolean')
    ],
    expenseController.updateRecurringExpense
);

// DELETE /recurring/:id
router.delete(
    '/recurring/:id',
    [
        param('id')
            .notEmpty()
            .withMessage('Recurring expense ID is required')
    ],
    expenseController.deleteRecurringExpense
);

// POST /recurring/process-due
router.post('/recurring/process-due', expenseController.processDueRecurringExpenses);

// ===== NEW ANALYTICS ROUTES =====
// GET /analytics/monthly-summary
router.get('/analytics/monthly-summary', [
    query('year').optional().isInt({ min: 2000, max: 3000 }).withMessage('Year must be a valid year'),
    query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12')
], expenseController.getMonthlySummary);

// GET /analytics/spending-patterns
router.get('/analytics/spending-patterns', [
    query('person').optional().isString().withMessage('Person must be a string'),
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], expenseController.getSpendingPatterns);

// GET /analytics/top-expenses
router.get('/analytics/top-expenses', [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('category').optional().isString().withMessage('Category must be a string'),
    query('timeframe').optional().isIn(['week', 'month', 'year', 'all']).withMessage('Timeframe must be week, month, year, or all')
], expenseController.getTopExpenses);

// GET /analytics/individual-vs-group
router.get('/analytics/individual-vs-group', [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO date'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid ISO date')
], expenseController.getIndividualVsGroupSpending);

export default router;
