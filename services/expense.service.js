// services/expense.service.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const expenseService = {
    // ===== EXISTING METHODS (ENHANCED) =====
    async getAllExpenses() {
        return await prisma.expense.findMany({
            include: {
                recurringExpense: {
                    select: {
                        id: true,
                        frequency: true,
                        description: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async createExpense(amount, description, paidBy, participants = [], shareType = 'EQUAL', customShares = null, category = 'OTHER', recurringExpenseId = null) {
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        let finalParticipants = Array.isArray(participants) ? participants : [];

        if (finalParticipants.length === 0) {
            finalParticipants = [paidBy];
        }

        if (!finalParticipants.includes(paidBy)) {
            finalParticipants.push(paidBy);
        }

        if (shareType === 'EXACT') {
            if (!customShares || typeof customShares !== 'object') {
                throw new Error('Custom shares are required for EXACT share type');
            }

            const totalCustomAmount = Object.values(customShares).reduce((sum, share) => sum + Number(share), 0);
            if (Math.abs(totalCustomAmount - amount) > 0.01) {
                throw new Error('Custom shares must add up to the total amount');
            }
        }

        if (shareType === 'PERCENTAGE') {
            if (!customShares || typeof customShares !== 'object') {
                throw new Error('Custom shares are required for PERCENTAGE share type');
            }

            const totalPercentage = Object.values(customShares).reduce((sum, share) => sum + Number(share), 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                throw new Error('Percentage shares must add up to 100%');
            }
        }

        return await prisma.expense.create({
            data: {
                amount: Number(amount),
                description,
                paidBy,
                participants: finalParticipants,
                shareType,
                customShares: customShares || {},
                category,
                recurringExpenseId
            },
            include: {
                recurringExpense: {
                    select: {
                        id: true,
                        frequency: true
                    }
                }
            }
        });
    },

    async updateExpense(id, updateData) {
        const expense = await prisma.expense.findUnique({
            where: { id }
        });

        if (!expense) {
            throw new Error('Expense not found');
        }

        if (updateData.amount && updateData.amount <= 0) {
            throw new Error('Amount must be positive');
        }

        if (updateData.amount) {
            updateData.amount = Number(updateData.amount);
        }

        if (updateData.participants && !Array.isArray(updateData.participants)) {
            updateData.participants = [updateData.participants];
        }

        return await prisma.expense.update({
            where: { id },
            data: updateData,
            include: {
                recurringExpense: {
                    select: {
                        id: true,
                        frequency: true
                    }
                }
            }
        });
    },

    async deleteExpense(id) {
        const expense = await prisma.expense.findUnique({
            where: { id }
        });

        if (!expense) {
            throw new Error('Expense not found');
        }

        return await prisma.expense.delete({
            where: { id }
        });
    },

    async getAllPeople() {
        const expenses = await prisma.expense.findMany();
        const peopleSet = new Set();

        expenses.forEach(expense => {
            peopleSet.add(expense.paidBy);
            if (Array.isArray(expense.participants)) {
                expense.participants.forEach(person => peopleSet.add(person));
            }
        });

        return Array.from(peopleSet).sort();
    },

    // ===== CATEGORY METHODS =====
    getExpenseCategories() {
        return [
            'FOOD', 'TRAVEL', 'UTILITIES', 'ENTERTAINMENT', 'RENT',
            'TRANSPORT', 'SHOPPING', 'HEALTHCARE', 'EDUCATION', 'OTHER'
        ];
    },

    async getExpensesByCategory() {
        const expenses = await prisma.expense.groupBy({
            by: ['category'],
            _sum: {
                amount: true
            },
            _count: {
                id: true
            },
            orderBy: {
                _sum: {
                    amount: 'desc'
                }
            }
        });

        return expenses.map(item => ({
            category: item.category,
            totalAmount: Number(item._sum.amount),
            expenseCount: item._count.id
        }));
    },

    async getCategorySummary(startDate, endDate) {
        const whereClause = {};

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        const categoryData = await prisma.expense.groupBy({
            by: ['category'],
            where: whereClause,
            _sum: {
                amount: true
            },
            _count: {
                id: true
            },
            _avg: {
                amount: true
            },
            orderBy: {
                _sum: {
                    amount: 'desc'
                }
            }
        });

        const totalAmount = categoryData.reduce((sum, item) => sum + Number(item._sum.amount), 0);

        return {
            summary: categoryData.map(item => ({
                category: item.category,
                totalAmount: Number(item._sum.amount),
                averageAmount: Number(item._avg.amount),
                expenseCount: item._count.id,
                percentage: totalAmount > 0 ? ((Number(item._sum.amount) / totalAmount) * 100).toFixed(2) : 0
            })),
            totalAmount,
            totalExpenses: categoryData.reduce((sum, item) => sum + item._count.id, 0)
        };
    },

    // ===== RECURRING EXPENSE METHODS =====
    async getAllRecurringExpenses() {
        return await prisma.recurringExpense.findMany({
            include: {
                _count: {
                    select: {
                        expenses: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    async createRecurringExpense(amount, description, paidBy, participants = [], shareType = 'EQUAL', customShares = null, category = 'OTHER', frequency, startDate, endDate = null) {
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }

        let finalParticipants = Array.isArray(participants) ? participants : [];
        if (finalParticipants.length === 0) {
            finalParticipants = [paidBy];
        }
        if (!finalParticipants.includes(paidBy)) {
            finalParticipants.push(paidBy);
        }

        // Calculate next due date
        const nextDue = this.calculateNextDueDate(new Date(startDate), frequency);

        return await prisma.recurringExpense.create({
            data: {
                amount: Number(amount),
                description,
                paidBy,
                participants: finalParticipants,
                shareType,
                customShares: customShares || {},
                category,
                frequency,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                nextDue
            }
        });
    },

    async updateRecurringExpense(id, updateData) {
        const recurringExpense = await prisma.recurringExpense.findUnique({
            where: { id }
        });

        if (!recurringExpense) {
            throw new Error('Recurring expense not found');
        }

        if (updateData.amount) {
            updateData.amount = Number(updateData.amount);
        }

        // Recalculate next due date if frequency changed
        if (updateData.frequency) {
            updateData.nextDue = this.calculateNextDueDate(recurringExpense.nextDue, updateData.frequency);
        }

        return await prisma.recurringExpense.update({
            where: { id },
            data: updateData
        });
    },

    async deleteRecurringExpense(id) {
        const recurringExpense = await prisma.recurringExpense.findUnique({
            where: { id }
        });

        if (!recurringExpense) {
            throw new Error('Recurring expense not found');
        }

        return await prisma.recurringExpense.delete({
            where: { id }
        });
    },

    calculateNextDueDate(currentDate, frequency) {
        const date = new Date(currentDate);

        switch (frequency) {
            case 'DAILY':
                date.setDate(date.getDate() + 1);
                break;
            case 'WEEKLY':
                date.setDate(date.getDate() + 7);
                break;
            case 'MONTHLY':
                date.setMonth(date.getMonth() + 1);
                break;
            case 'YEARLY':
                date.setFullYear(date.getFullYear() + 1);
                break;
            default:
                throw new Error('Invalid frequency');
        }

        return date;
    },

    async processDueRecurringExpenses() {
        const now = new Date();
        const dueExpenses = await prisma.recurringExpense.findMany({
            where: {
                isActive: true,
                nextDue: {
                    lte: now
                },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ]
            }
        });

        const createdExpenses = [];

        for (const recurringExpense of dueExpenses) {
            // Create the actual expense
            const expense = await this.createExpense(
                recurringExpense.amount,
                recurringExpense.description,
                recurringExpense.paidBy,
                recurringExpense.participants,
                recurringExpense.shareType,
                recurringExpense.customShares,
                recurringExpense.category,
                recurringExpense.id
            );

            createdExpenses.push(expense);

            // Update next due date
            const nextDue = this.calculateNextDueDate(recurringExpense.nextDue, recurringExpense.frequency);

            await prisma.recurringExpense.update({
                where: { id: recurringExpense.id },
                data: { nextDue }
            });
        }

        return {
            processedCount: createdExpenses.length,
            createdExpenses
        };
    },

    // ===== ANALYTICS METHODS =====
    async getMonthlySummary(year, month) {
        const currentDate = new Date();
        const targetYear = year || currentDate.getFullYear();
        const targetMonth = month || (currentDate.getMonth() + 1);

        const startDate = new Date(targetYear, targetMonth - 1, 1);
        const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

        const expenses = await prisma.expense.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                recurringExpense: {
                    select: {
                        frequency: true
                    }
                }
            }
        });

        const totalAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
        const averageExpense = expenses.length > 0 ? totalAmount / expenses.length : 0;

        const categoryBreakdown = expenses.reduce((acc, expense) => {
            const category = expense.category;
            acc[category] = (acc[category] || 0) + Number(expense.amount);
            return acc;
        }, {});

        const peopleSpending = expenses.reduce((acc, expense) => {
            const person = expense.paidBy;
            acc[person] = (acc[person] || 0) + Number(expense.amount);
            return acc;
        }, {});

        return {
            period: `${targetYear}-${targetMonth.toString().padStart(2, '0')}`,
            totalAmount,
            totalExpenses: expenses.length,
            averageExpense,
            categoryBreakdown,
            peopleSpending,
            recurringExpenses: expenses.filter(e => e.recurringExpenseId).length
        };
    },

    async getSpendingPatterns(person, startDate, endDate) {
        const whereClause = {};

        if (person) {
            whereClause.paidBy = person;
        }

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        const expenses = await prisma.expense.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' }
        });

        // Individual spending analysis
        const individualSpending = expenses.reduce((acc, expense) => {
            const person = expense.paidBy;
            const participantCount = expense.participants.length;

            if (!acc[person]) {
                acc[person] = {
                    totalPaid: 0,
                    totalExpenses: 0,
                    averageExpense: 0,
                    categoryBreakdown: {},
                    groupExpenses: 0,
                    individualExpenses: 0
                };
            }

            acc[person].totalPaid += Number(expense.amount);
            acc[person].totalExpenses++;
            acc[person].categoryBreakdown[expense.category] =
                (acc[person].categoryBreakdown[expense.category] || 0) + Number(expense.amount);

            if (participantCount > 1) {
                acc[person].groupExpenses++;
            } else {
                acc[person].individualExpenses++;
            }

            return acc;
        }, {});

        // Calculate averages
        Object.keys(individualSpending).forEach(person => {
            const data = individualSpending[person];
            data.averageExpense = data.totalExpenses > 0 ? data.totalPaid / data.totalExpenses : 0;
        });

        return {
            totalExpenses: expenses.length,
            totalAmount: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
            individualSpending,
            timeRange: {
                startDate: startDate || expenses[expenses.length - 1]?.createdAt,
                endDate: endDate || expenses[0]?.createdAt
            }
        };
    },

    async getTopExpenses(limit = 10, category, timeframe = 'all') {
        const whereClause = {};

        if (category) {
            whereClause.category = category;
        }

        if (timeframe !== 'all') {
            const now = new Date();
            let startDate;

            switch (timeframe) {
                case 'week':
                    startDate = new Date(now.setDate(now.getDate() - 7));
                    break;
                case 'month':
                    startDate = new Date(now.setMonth(now.getMonth() - 1));
                    break;
                case 'year':
                    startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                    break;
            }

            whereClause.createdAt = { gte: startDate };
        }

        const topExpenses = await prisma.expense.findMany({
            where: whereClause,
            orderBy: { amount: 'desc' },
            take: limit,
            include: {
                recurringExpense: {
                    select: {
                        frequency: true
                    }
                }
            }
        });

        return {
            expenses: topExpenses.map(expense => ({
                ...expense,
                amount: Number(expense.amount)
            })),
            filters: {
                category: category || 'all',
                timeframe,
                limit
            }
        };
    },

    async getIndividualVsGroupSpending(startDate, endDate) {
        const whereClause = {};

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) whereClause.createdAt.gte = new Date(startDate);
            if (endDate) whereClause.createdAt.lte = new Date(endDate);
        }

        const expenses = await prisma.expense.findMany({
            where: whereClause
        });

        const analysis = expenses.reduce((acc, expense) => {
            const participantCount = expense.participants.length;
            const amount = Number(expense.amount);

            if (participantCount === 1) {
                acc.individual.totalAmount += amount;
                acc.individual.count++;
                acc.individual.categories[expense.category] =
                    (acc.individual.categories[expense.category] || 0) + amount;
            } else {
                acc.group.totalAmount += amount;
                acc.group.count++;
                acc.group.categories[expense.category] =
                    (acc.group.categories[expense.category] || 0) + amount;
                acc.group.averageParticipants += participantCount;
            }

            return acc;
        }, {
            individual: { totalAmount: 0, count: 0, categories: {} },
            group: { totalAmount: 0, count: 0, categories: {}, averageParticipants: 0 }
        });

        // Calculate averages
        if (analysis.group.count > 0) {
            analysis.group.averageParticipants = analysis.group.averageParticipants / analysis.group.count;
        }

        analysis.individual.averageAmount = analysis.individual.count > 0 ?
            analysis.individual.totalAmount / analysis.individual.count : 0;

        analysis.group.averageAmount = analysis.group.count > 0 ?
            analysis.group.totalAmount / analysis.group.count : 0;

        const totalAmount = analysis.individual.totalAmount + analysis.group.totalAmount;

        return {
            individual: {
                ...analysis.individual,
                percentage: totalAmount > 0 ? ((analysis.individual.totalAmount / totalAmount) * 100).toFixed(2) : 0
            },
            group: {
                ...analysis.group,
                percentage: totalAmount > 0 ? ((analysis.group.totalAmount / totalAmount) * 100).toFixed(2) : 0
            },
            total: {
                amount: totalAmount,
                expenses: analysis.individual.count + analysis.group.count
            },
            timeRange: {
                startDate: startDate || null,
                endDate: endDate || null
            }
        };
    }
};

export default expenseService;