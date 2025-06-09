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

        // Ensure participants is an array and includes the person who paid
        let finalParticipants = Array.isArray(participants) ? participants : [];

        // If no participants provided, default to just the person who paid
        if (finalParticipants.length === 0) {
            finalParticipants = [paidBy];
        }

        // Ensure the person who paid is included in participants
        if (!finalParticipants.includes(paidBy)) {
            finalParticipants.push(paidBy);
        }

        // For EXACT shares, validate that customShares is provided and matches participants
        if (shareType === 'EXACT') {
            if (!customShares || typeof customShares !== 'object') {
                throw new Error('Custom shares are required for EXACT share type');
            }

            // Validate that all participants have shares defined
            const totalCustomAmount = Object.values(customShares).reduce((sum, share) => sum + Number(share), 0);
            if (Math.abs(totalCustomAmount - amount) > 0.01) {
                throw new Error('Custom shares must add up to the total amount');
            }
        }

        return await prisma.expense.create({
            data: {
                amount: Number(amount),
                description,
                paidBy,
                participants: finalParticipants,
                shareType,
                customShares: customShares || {}
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

        // Convert amount to number if provided
        if (updateData.amount) {
            updateData.amount = Number(updateData.amount);
        }

        // Handle participants array
        if (updateData.participants && !Array.isArray(updateData.participants)) {
            updateData.participants = [updateData.participants];
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
            // Add the person who paid
            peopleSet.add(expense.paidBy);

            // Add all participants
            if (Array.isArray(expense.participants)) {
                expense.participants.forEach(person => peopleSet.add(person));
            }
        });

        return Array.from(peopleSet).sort();
    }
};

export default expenseService;