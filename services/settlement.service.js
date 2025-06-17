import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function roundMoney(value) {
    if (isNaN(value)) {
        throw new Error(`Invalid money value: ${value}`);
    }
    return Math.round(Number(value) * 100) / 100;
}

const settlementService = {
    async calculateBalances() {
        try {
            const expenses = await prisma.expense.findMany();
            const balances = {};

            expenses.forEach(expense => {
                try {
                    const amount = Number(expense.amount);
                    if (isNaN(amount)) {
                        console.error(`Invalid amount for expense ${expense.id}: ${expense.amount}`);
                        return;
                    }

                    const paidBy = String(expense.paidBy);
                    let participants = [];

                    // Handle participants whether they're stored as array or object
                    if (Array.isArray(expense.participants)) {
                        participants = expense.participants.map(String);
                    } else if (expense.participants && typeof expense.participants === 'object') {
                        participants = Object.keys(expense.participants).map(String);
                    }

                    // Initialize payer balance
                    if (!balances[paidBy]) {
                        balances[paidBy] = { paid: 0, owes: 0, balance: 0 };
                    }
                    balances[paidBy].paid += amount;

                    // Calculate shares
                    if (expense.shareType === 'EQUAL') {
                        const share = amount / participants.length;
                        participants.forEach(person => {
                            if (!balances[person]) {
                                balances[person] = { paid: 0, owes: 0, balance: 0 };
                            }
                            balances[person].owes += share;
                        });
                    } else if (expense.shareType === 'EXACT' && expense.customShares) {
                        Object.entries(expense.customShares).forEach(([person, share]) => {
                            const numShare = Number(share);
                            if (!isNaN(numShare)) {
                                if (!balances[person]) {
                                    balances[person] = { paid: 0, owes: 0, balance: 0 };
                                }
                                balances[person].owes += numShare;
                            }
                        });
                    } else if (expense.shareType === 'PERCENTAGE' && expense.customShares) {
                        Object.entries(expense.customShares).forEach(([person, percentage]) => {
                            const numPercentage = Number(percentage);
                            if (!isNaN(numPercentage)) {
                                if (!balances[person]) {
                                    balances[person] = { paid: 0, owes: 0, balance: 0 };
                                }
                                const share = (amount * numPercentage) / 100;
                                balances[person].owes += share;
                            }
                        });
                    }
                } catch (expenseError) {
                    console.error(`Error processing expense ${expense.id}:`, expenseError);
                }
            });

            // Calculate final balances
            Object.keys(balances).forEach(person => {
                const paid = roundMoney(balances[person].paid);
                const owes = roundMoney(balances[person].owes);
                balances[person] = {
                    paid,
                    owes,
                    balance: roundMoney(paid - owes)
                };
            });

            return balances;
        } catch (error) {
            console.error('Error in calculateBalances:', error);
            throw new Error('Failed to calculate balances');
        }
    },

    async calculateSettlements() {
        try {
            const balances = await this.calculateBalances();
            const settlements = [];
            const debtors = [];
            const creditors = [];

            // Validate and prepare debtors/creditors
            Object.entries(balances).forEach(([person, data]) => {
                const balance = Number(data.balance);
                if (isNaN(balance)) {
                    console.error(`Invalid balance for ${person}:`, data.balance);
                    return;
                }

                if (balance < -0.01) {
                    debtors.push({
                        person,
                        amount: roundMoney(Math.abs(balance))
                    });
                } else if (balance > 0.01) {
                    creditors.push({
                        person,
                        amount: roundMoney(balance)
                    });
                }
            });

            // Sort by amount (descending)
            debtors.sort((a, b) => b.amount - a.amount);
            creditors.sort((a, b) => b.amount - a.amount);

            // Calculate settlements
            let i = 0, j = 0;
            while (i < debtors.length && j < creditors.length) {
                const debtor = debtors[i];
                const creditor = creditors[j];
                const amount = roundMoney(Math.min(debtor.amount, creditor.amount));

                if (amount > 0) {
                    settlements.push({
                        from: debtor.person,
                        to: creditor.person,
                        amount
                    });

                    debtor.amount = roundMoney(debtor.amount - amount);
                    creditor.amount = roundMoney(creditor.amount - amount);

                    if (debtor.amount <= 0.01) i++;
                    if (creditor.amount <= 0.01) j++;
                } else {
                    break;
                }
            }

            return settlements;
        } catch (error) {
            console.error('Error in calculateSettlements:', error);
            throw new Error('Failed to calculate settlements');
        }
    },

    async getExpenseSummary() {
        try {
            const expenses = await prisma.expense.findMany();
            const validExpenses = expenses.filter(exp => !isNaN(Number(exp.amount)));
            const totalExpenses = validExpenses.length;
            const totalAmount = validExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
            const people = await this.getAllPeople();

            return {
                totalExpenses,
                totalAmount: roundMoney(totalAmount),
                totalPeople: people.length,
                averageExpense: totalExpenses > 0 ? roundMoney(totalAmount / totalExpenses) : 0
            };
        } catch (error) {
            console.error('Error in getExpenseSummary:', error);
            throw new Error('Failed to get expense summary');
        }
    },

    async getAllPeople() {
        try {
            const expenses = await prisma.expense.findMany();
            const peopleSet = new Set();

            expenses.forEach(expense => {
                peopleSet.add(String(expense.paidBy));

                if (Array.isArray(expense.participants)) {
                    expense.participants.forEach(p => peopleSet.add(String(p)));
                } else if (expense.participants && typeof expense.participants === 'object') {
                    Object.keys(expense.participants).forEach(p => peopleSet.add(String(p)));
                }
            });

            return Array.from(peopleSet).sort();
        } catch (error) {
            console.error('Error in getAllPeople:', error);
            throw new Error('Failed to get all people');
        }
    }
};

export default settlementService;