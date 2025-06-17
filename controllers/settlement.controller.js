import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function roundMoney(value) {
    if (isNaN(value)) {
        console.error(`Invalid money value: ${value}`);
        return 0;
    }
    return Math.round(Number(value) * 100) / 100;
}

const settlementService = {
    async calculateBalances() {
        try {
            const expenses = await prisma.expense.findMany();
            const balances = {};

            console.log(`Processing ${expenses.length} expenses`);

            expenses.forEach((expense, index) => {
                try {
                    // Convert amount to number, handling string values
                    const amount = parseFloat(expense.amount);
                    if (isNaN(amount) || amount <= 0) {
                        console.error(`Invalid amount for expense ${expense.id}: ${expense.amount}`);
                        return;
                    }

                    const paidBy = String(expense.paidBy).trim();
                    let participants = [];

                    // Handle participants array
                    if (Array.isArray(expense.participants)) {
                        participants = expense.participants.map(p => String(p).trim());
                    } else if (expense.participants && typeof expense.participants === 'object') {
                        participants = Object.keys(expense.participants).map(p => String(p).trim());
                    } else {
                        console.error(`Invalid participants for expense ${expense.id}:`, expense.participants);
                        return;
                    }

                    if (participants.length === 0) {
                        console.error(`No participants found for expense ${expense.id}`);
                        return;
                    }

                    // Initialize balance for payer if not exists
                    if (!balances[paidBy]) {
                        balances[paidBy] = { paid: 0, owes: 0, balance: 0 };
                    }

                    // Add to paid amount
                    balances[paidBy].paid += amount;

                    // Calculate and distribute shares
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
                            const personName = String(person).trim();
                            const shareAmount = parseFloat(share);

                            if (!isNaN(shareAmount) && shareAmount > 0) {
                                if (!balances[personName]) {
                                    balances[personName] = { paid: 0, owes: 0, balance: 0 };
                                }
                                balances[personName].owes += shareAmount;
                            }
                        });
                    } else if (expense.shareType === 'PERCENTAGE' && expense.customShares) {
                        Object.entries(expense.customShares).forEach(([person, percentage]) => {
                            const personName = String(person).trim();
                            const percentageValue = parseFloat(percentage);

                            if (!isNaN(percentageValue) && percentageValue > 0) {
                                if (!balances[personName]) {
                                    balances[personName] = { paid: 0, owes: 0, balance: 0 };
                                }
                                const share = (amount * percentageValue) / 100;
                                balances[personName].owes += share;
                            }
                        });
                    }

                    console.log(`Processed expense ${index + 1}: ${expense.description} - ${amount} paid by ${paidBy}`);

                } catch (expenseError) {
                    console.error(`Error processing expense ${expense.id}:`, expenseError);
                }
            });

            // Round all final balances
            Object.keys(balances).forEach(person => {
                const paid = roundMoney(balances[person].paid);
                const owes = roundMoney(balances[person].owes);
                const balance = roundMoney(paid - owes);

                balances[person] = {
                    paid,
                    owes,
                    balance
                };

                console.log(`${person}: paid=${paid}, owes=${owes}, balance=${balance}`);
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

            // Create arrays for debtors (negative balance) and creditors (positive balance)
            const debtors = [];
            const creditors = [];

            Object.entries(balances).forEach(([person, data]) => {
                const balance = Number(data.balance);

                if (isNaN(balance)) {
                    console.error(`Invalid balance for ${person}:`, data.balance);
                    return;
                }

                if (balance < -0.01) { // Person owes money
                    debtors.push({
                        person,
                        amount: roundMoney(Math.abs(balance))
                    });
                } else if (balance > 0.01) { // Person is owed money
                    creditors.push({
                        person,
                        amount: roundMoney(balance)
                    });
                }
            });

            console.log('Debtors:', debtors);
            console.log('Creditors:', creditors);

            // Sort by amount (largest first for efficient settlement)
            debtors.sort((a, b) => b.amount - a.amount);
            creditors.sort((a, b) => b.amount - a.amount);

            // Create settlements by matching debtors with creditors
            let debtorIndex = 0;
            let creditorIndex = 0;

            while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
                const debtor = debtors[debtorIndex];
                const creditor = creditors[creditorIndex];

                const settlementAmount = roundMoney(Math.min(debtor.amount, creditor.amount));

                if (settlementAmount > 0.01) {
                    settlements.push({
                        from: debtor.person,
                        to: creditor.person,
                        amount: settlementAmount
                    });

                    // Update remaining amounts
                    debtor.amount = roundMoney(debtor.amount - settlementAmount);
                    creditor.amount = roundMoney(creditor.amount - settlementAmount);
                }

                // Move to next debtor/creditor if current one is settled
                if (debtor.amount <= 0.01) {
                    debtorIndex++;
                }
                if (creditor.amount <= 0.01) {
                    creditorIndex++;
                }
            }

            console.log('Calculated settlements:', settlements);
            return settlements;

        } catch (error) {
            console.error('Error in calculateSettlements:', error);
            throw new Error('Failed to calculate settlements');
        }
    },

    async getExpenseSummary() {
        try {
            const expenses = await prisma.expense.findMany();
            const validExpenses = expenses.filter(exp => {
                const amount = parseFloat(exp.amount);
                return !isNaN(amount) && amount > 0;
            });

            const totalExpenses = validExpenses.length;
            const totalAmount = validExpenses.reduce((sum, exp) => {
                return sum + parseFloat(exp.amount);
            }, 0);

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
                // Add payer
                peopleSet.add(String(expense.paidBy).trim());

                // Add participants
                if (Array.isArray(expense.participants)) {
                    expense.participants.forEach(p => peopleSet.add(String(p).trim()));
                } else if (expense.participants && typeof expense.participants === 'object') {
                    Object.keys(expense.participants).forEach(p => peopleSet.add(String(p).trim()));
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