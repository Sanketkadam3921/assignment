import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const settlementService = {
    // Calculate balances for each person
    async calculateBalances() {
        const expenses = await prisma.expense.findMany();
        const balances = {};

        expenses.forEach(expense => {
            const { amount, paidBy, participants, shareType, customShares } = expense;

            // Initialize balance for the person who paid
            if (!balances[paidBy]) {
                balances[paidBy] = { paid: 0, owes: 0, balance: 0 };
            }

            // Add to paid amount
            balances[paidBy].paid += amount;

            // Calculate shares based on share type
            if (shareType === 'EQUAL') {
                const sharePerPerson = amount / participants.length;

                participants.forEach(person => {
                    if (!balances[person]) {
                        balances[person] = { paid: 0, owes: 0, balance: 0 };
                    }
                    balances[person].owes += sharePerPerson;
                });

            } else if (shareType === 'EXACT' && customShares) {
                // Handle custom shares
                Object.entries(customShares).forEach(([person, share]) => {
                    if (!balances[person]) {
                        balances[person] = { paid: 0, owes: 0, balance: 0 };
                    }
                    balances[person].owes += Number(share);
                });

            } else if (shareType === 'PERCENTAGE' && customShares) {
                // Handle percentage shares
                Object.entries(customShares).forEach(([person, percentage]) => {
                    if (!balances[person]) {
                        balances[person] = { paid: 0, owes: 0, balance: 0 };
                    }
                    const shareAmount = (amount * Number(percentage)) / 100;
                    balances[person].owes += shareAmount;
                });
            }
        });

        // Calculate final balance (positive = owed money, negative = owes money)
        Object.keys(balances).forEach(person => {
            balances[person].balance = Math.round((balances[person].paid - balances[person].owes) * 100) / 100;
            balances[person].paid = Math.round(balances[person].paid * 100) / 100;
            balances[person].owes = Math.round(balances[person].owes * 100) / 100;
        });

        return balances;
    },

    // Calculate simplified settlements
    async calculateSettlements() {
        const balances = await this.calculateBalances();
        const settlements = [];

        // Separate debtors and creditors
        const debtors = [];
        const creditors = [];

        Object.entries(balances).forEach(([person, data]) => {
            if (data.balance < -0.01) { // Owes money (threshold to avoid tiny amounts)
                debtors.push({ person, amount: Math.abs(data.balance) });
            } else if (data.balance > 0.01) { // Is owed money
                creditors.push({ person, amount: data.balance });
            }
        });

        // Sort for consistent results
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        // Create settlement transactions using a greedy algorithm
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            const settleAmount = Math.min(debtor.amount, creditor.amount);

            if (settleAmount > 0.01) { // Only create settlements for meaningful amounts
                settlements.push({
                    from: debtor.person,
                    to: creditor.person,
                    amount: Math.round(settleAmount * 100) / 100
                });
            }

            debtor.amount -= settleAmount;
            creditor.amount -= settleAmount;

            // Move to next debtor/creditor if current one is settled
            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return settlements;
    },

    // Get expense summary
    async getExpenseSummary() {
        const expenses = await prisma.expense.findMany();
        const totalExpenses = expenses.length;
        const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const people = await this.getAllPeople();

        return {
            totalExpenses,
            totalAmount: Math.round(totalAmount * 100) / 100,
            totalPeople: people.length,
            averageExpense: totalExpenses > 0 ? Math.round((totalAmount / totalExpenses) * 100) / 100 : 0
        };
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
    }
};

export default settlementService;