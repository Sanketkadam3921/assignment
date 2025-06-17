import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function roundMoney(value) {
    return Math.round(value * 100 + Number.EPSILON) / 100;
}

const settlementService = {
    // Calculate balances for each person
    async calculateBalances() {
        const expenses = await prisma.expense.findMany();
        const balances = {};

        expenses.forEach(expense => {
            const { amount, paidBy, participants: rawParticipants, shareType, customShares } = expense;

            // Ensure participants is always an array
            const participants = Array.isArray(rawParticipants)
                ? rawParticipants
                : Object.keys(rawParticipants || {});

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
            balances[person].balance = roundMoney(balances[person].paid - balances[person].owes);
            balances[person].paid = roundMoney(balances[person].paid);
            balances[person].owes = roundMoney(balances[person].owes);
        });

        return balances;
    },

    // Calculate simplified settlements
    async calculateSettlements() {
        const balances = await this.calculateBalances();
        const settlements = [];

        // Validate balances first
        const validBalances = {};
        let hasInvalidAmounts = false;

        Object.entries(balances).forEach(([person, data]) => {
            // Check for extremely large numbers that might be data errors
            if (Math.abs(data.balance) > 1e15) { // 1 quadrillion threshold
                console.error(`Invalid balance for ${person}: ${data.balance}`);
                hasInvalidAmounts = true;
                return;
            }
            validBalances[person] = data;
        });

        if (hasInvalidAmounts) {
            throw new Error("Cannot calculate settlements - invalid balance amounts detected");
        }

        // Separate debtors and creditors
        const debtors = [];
        const creditors = [];

        Object.entries(validBalances).forEach(([person, data]) => {
            if (data.balance < -0.01) { // Owes money (using small threshold)
                debtors.push({ person, amount: Math.abs(data.balance) });
            } else if (data.balance > 0.01) { // Is owed money
                creditors.push({ person, amount: data.balance });
            }
        });

        // Sort for consistent results
        debtors.sort((a, b) => b.amount - a.amount);
        creditors.sort((a, b) => b.amount - a.amount);

        // Create settlement transactions
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            const settleAmount = Math.min(debtor.amount, creditor.amount);

            if (settleAmount > 0.01) { // Only create meaningful settlements
                settlements.push({
                    from: debtor.person,
                    to: creditor.person,
                    amount: roundMoney(settleAmount)
                });
            }

            debtor.amount -= settleAmount;
            creditor.amount -= settleAmount;

            if (debtor.amount <= 0.01) i++;
            if (creditor.amount <= 0.01) j++;
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
            totalAmount: roundMoney(totalAmount),
            totalPeople: people.length,
            averageExpense: totalExpenses > 0 ? roundMoney(totalAmount / totalExpenses) : 0
        };
    },

    async getAllPeople() {
        const expenses = await prisma.expense.findMany();
        const peopleSet = new Set();

        expenses.forEach(expense => {
            peopleSet.add(expense.paidBy);
            const participants = Array.isArray(expense.participants)
                ? expense.participants
                : Object.keys(expense.participants || {});
            participants.forEach(person => peopleSet.add(person));
        });

        return Array.from(peopleSet).sort();
    }
};

export default settlementService;