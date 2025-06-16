// controllers/expense.controller.js
import { validationResult } from 'express-validator';
import expenseService from '../services/expense.service.js';

const expenseController = {
    // ===== EXISTING METHODS (ENHANCED) =====
    async getAllExpenses(req, res) {
        try {
            const expenses = await expenseService.getAllExpenses();
            return res.status(200).json({
                success: true,
                data: expenses,
                message: 'Expenses retrieved successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async createExpense(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { amount, description, paid_by, participants, shareType, customShares, category } = req.body;

            const expense = await expenseService.createExpense(
                amount,
                description,
                paid_by,
                participants,
                shareType,
                customShares,
                category
            );

            return res.status(201).json({
                success: true,
                data: expense,
                message: 'Expense added successfully'
            });

        } catch (error) {
            if (error.message.includes('must be positive') ||
                error.message.includes('must add up') ||
                error.message.includes('are required for')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async updateExpense(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const updateData = req.body;

            const expense = await expenseService.updateExpense(id, updateData);

            return res.status(200).json({
                success: true,
                data: expense,
                message: 'Expense updated successfully'
            });

        } catch (error) {
            if (error.message === 'Expense not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            if (error.message === 'Amount must be positive') {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async deleteExpense(req, res) {
        try {
            const { id } = req.params;
            await expenseService.deleteExpense(id);

            return res.status(200).json({
                success: true,
                message: 'Expense deleted successfully'
            });

        } catch (error) {
            if (error.message === 'Expense not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async getAllPeople(req, res) {
        try {
            const people = await expenseService.getAllPeople();
            return res.status(200).json({
                success: true,
                data: people,
                message: 'People retrieved successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    // ===== NEW CATEGORY METHODS =====
    async getExpenseCategories(req, res) {
        try {
            const categories = expenseService.getExpenseCategories();
            return res.status(200).json({
                success: true,
                data: categories,
                message: 'Categories retrieved successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async getExpensesByCategory(req, res) {
        try {
            const categoryData = await expenseService.getExpensesByCategory();
            return res.status(200).json({
                success: true,
                data: categoryData,
                message: 'Expenses by category retrieved successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async getCategorySummary(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { startDate, endDate } = req.query;
            const summary = await expenseService.getCategorySummary(startDate, endDate);

            return res.status(200).json({
                success: true,
                data: summary,
                message: 'Category summary retrieved successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    // ===== NEW RECURRING EXPENSE METHODS =====
    async getAllRecurringExpenses(req, res) {
        try {
            const recurringExpenses = await expenseService.getAllRecurringExpenses();
            return res.status(200).json({
                success: true,
                data: recurringExpenses,
                message: 'Recurring expenses retrieved successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async createRecurringExpense(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const {
                amount, description, paid_by, participants, shareType,
                customShares, category, frequency, startDate, endDate
            } = req.body;

            const recurringExpense = await expenseService.createRecurringExpense(
                amount, description, paid_by, participants, shareType,
                customShares, category, frequency, startDate, endDate
            );

            return res.status(201).json({
                success: true,
                data: recurringExpense,
                message: 'Recurring expense created successfully'
            });

        } catch (error) {
            if (error.message.includes('must be positive') ||
                error.message.includes('Invalid frequency')) {
                return res.status(400).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async updateRecurringExpense(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { id } = req.params;
            const updateData = req.body;

            const recurringExpense = await expenseService.updateRecurringExpense(id, updateData);

            return res.status(200).json({
                success: true,
                data: recurringExpense,
                message: 'Recurring expense updated successfully'
            });

        } catch (error) {
            if (error.message === 'Recurring expense not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async deleteRecurringExpense(req, res) {
        try {
            const { id } = req.params;
            await expenseService.deleteRecurringExpense(id);

            return res.status(200).json({
                success: true,
                message: 'Recurring expense deleted successfully'
            });

        } catch (error) {
            if (error.message === 'Recurring expense not found') {
                return res.status(404).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async processDueRecurringExpenses(req, res) {
        try {
            const result = await expenseService.processDueRecurringExpenses();

            return res.status(200).json({
                success: true,
                data: result,
                message: `Processed ${result.processedCount} recurring expenses`
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    // ===== NEW ANALYTICS METHODS =====
    async getMonthlySummary(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { year, month } = req.query;
            const summary = await expenseService.getMonthlySummary(
                year ? parseInt(year) : undefined,
                month ? parseInt(month) : undefined
            );

            return res.status(200).json({
                success: true,
                data: summary,
                message: 'Monthly summary retrieved successfully'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async getSpendingPatterns(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { person, startDate, endDate } = req.query;
            const patterns = await expenseService.getSpendingPatterns(person, startDate, endDate);

            return res.status(200).json({
                success: true,
                data: patterns,
                message: 'Spending patterns retrieved successfully'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async getTopExpenses(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { limit, category, timeframe } = req.query;
            const topExpenses = await expenseService.getTopExpenses(
                limit ? parseInt(limit) : undefined,
                category,
                timeframe
            );

            return res.status(200).json({
                success: true,
                data: topExpenses,
                message: 'Top expenses retrieved successfully'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    },

    async getIndividualVsGroupSpending(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { startDate, endDate } = req.query;
            const analysis = await expenseService.getIndividualVsGroupSpending(startDate, endDate);

            return res.status(200).json({
                success: true,
                data: analysis,
                message: 'Individual vs group spending analysis retrieved successfully'
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Server error',
                error: error.message
            });
        }
    }
};

export default expenseController;