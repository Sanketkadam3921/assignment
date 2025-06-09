import { validationResult } from 'express-validator';
import expenseService from '../services/expense.service.js';

const expenseController = {
    // GET /expenses
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

    // POST /expenses
    async createExpense(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    success: false,
                    errors: errors.array()
                });
            }

            const { amount, description, paid_by, participants, shareType, customShares } = req.body;

            const expense = await expenseService.createExpense(
                amount,
                description,
                paid_by,
                participants,
                shareType,
                customShares
            );

            return res.status(201).json({
                success: true,
                data: expense,
                message: 'Expense added successfully'
            });

        } catch (error) {
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

    // PUT /expenses/:id
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

    // DELETE /expenses/:id
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

    // GET /people
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
    }
};

export default expenseController;