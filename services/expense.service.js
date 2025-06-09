import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const expenseService = {
    async getAllExpenses() {
        return await prisma.expense.findMany({
            orderBy: { createdAt: 'desc' }
        });
    },

    async createExpense(amount, description, paidBy, participants = [], shareType = 'EQUAL', customShares = null) {
        if (amount <= 0) {
            throw new Error('Amount must be positive');
        }


        let finalParticipants = participants.length > 0 ? participants : [paidBy];

        if (!finalParticipants.includes(paidBy)) {
            finalParticipants.push(paidBy);
        }

        return await prisma.expense.create({
            data: {
                amount,
                description,
                paidBy,
                participants: finalParticipants,
                shareType,
                customShares
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

        return await prisma.expense.update({
            where: { id },
            data: updateData
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
            expense.participants.forEach(person => peopleSet.add(person));
        });

        return Array.from(peopleSet);
    }
};

export default expenseService;