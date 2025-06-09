import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const settlementService = {
    // Calculate balances for each person
    async calculateBalances() {
        const expenses = await prisma.expense.findMany();
        const balances = {};

        expenses.forEach(expense => {
            const { amount, paidBy, participants, shareType, customShares } = expense;

            // Initialize balances
            participants.forEach(person => {
                if (!balances[person]) {
                    balances[person] = { paid: 0, owes: 0, balance: 0 };
                }
            });

            // Add to paid amount
            if (!balances[paidBy]) {
                balances[paidBy] = { paid: 0, owes: 0, balance: 0 };
            }
            balances[paidBy].paid += amount;

            // Calculate shares
            let sharePerPerson;
            if (shareType === 'EQUAL') {
                sharePerPerson = amount / participants.length;
                participants.forEach(person => {
                    balances[person].owes += sharePerPerson;
                });
            } else if (shareType === 'EXACT' && customShares) {
                Object.entries(customShares).forEach(([person, share]) => {
                    if (!balances[person]) {
                        balances[person] = { paid: 0, owes: 0, balance: 0 };
                    }
                    balances[person].owes += share;
                });
            }
        });

        // Calculate final balance (positive = owed money, negative = owes money)
        Object.keys(balances).forEach(person => {
            balances[person].balance = balances[person].paid - balances[person].owes;
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
            if (data.balance < 0) {
                debtors.push({ person, amount: Math.abs(data.balance) });
            } else if (data.balance > 0) {
                creditors.push({ person, amount: data.balance });
            }
        });

        // Create settlement transactions (simplified algorithm)
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            const settleAmount = Math.min(debtor.amount, creditor.amount);

            if (settleAmount > 0.01) { // Ignore very small amounts
                settlements.push({
                    from: debtor.person,
                    to: creditor.person,
                    amount: Math.round(settleAmount * 100) / 100
                });
            }

            debtor.amount -= settleAmount;
            creditor.amount -= settleAmount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return settlements;
    }
};

export default settlementService;