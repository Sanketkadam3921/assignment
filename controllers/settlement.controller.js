import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function roundMoney(value) {
    const num = Number(value);
    if (isNaN(num)) {
        return 0;
    }
    return Math.round(num * 100) / 100;
}

const settlementService = {
    async calculateBalances() {
        try {
            const expenses = await prisma.expense.findMany();
            const balances = {};

            // Process each expense
            for (const expense of expenses) {
                try {
                    // Parse amount safely
                    const amount = parseFloat(expense.amount);
                    if (isNaN(amount) || amount <= 0) {
                        console.warn(`Skipping expense ${expense.id} - invalid amount: ${expense.amount}`);
                        continue;
                    }

                    const paidBy = String(expense.paidBy || '').trim();
                    if (!paidBy) {
                        console.warn(`Skipping expense ${expense.id} - no paidBy`);
                        continue;
                    }

                    // Get participants
                    let participants = [];
                    if (Array.isArray(expense.participants)) {
                        participants = expense.participants
                            .map(p => String(p || '').trim())
                            .filter(p => p.length > 0);
                    }

                    if (participants.length === 0) {
                        console.warn(`Skipping expense ${expense.id} - no valid participants`);
                        continue;
                    }

                    // Initialize balances for all people involved
                    [paidBy, ...participants].forEach(person => {
                        if (!balances[person]) {
                            balances[person] = { paid: 0, owes: 0, balance: 0 };
                        }
                    });

                    // Add to paid amount
                    balances[paidBy].paid += amount;

                    // Calculate shares based on share type
                    if (expense.shareType === 'EQUAL') {
                        const sharePerPerson = amount / participants.length;
                        participants.forEach(person => {
                            balances[person].owes += sharePerPerson;
                        });
                    }
                    else if (expense.shareType === 'EXACT' && expense.customShares) {
                        for (const [person, share] of Object.entries(expense.customShares)) {
                            const shareAmount = parseFloat(share);
                            if (!isNaN(shareAmount) && shareAmount > 0) {
                                const personName = String(person).trim();
                                if (balances[personName]) {
                                    balances[personName].owes += shareAmount;
                                }
                            }
                        }
                    }
                    else if (expense.shareType === 'PERCENTAGE' && expense.customShares) {
                        for (const [person, percentage] of Object.entries(expense.customShares)) {
                            const percentValue = parseFloat(percentage);
                            if (!isNaN(percentValue) && percentValue > 0) {
                                const personName = String(person).trim();
                                if (balances[personName]) {
                                    const shareAmount = (amount * percentValue) / 100;
                                    balances[personName].owes += shareAmount;
                                }
                            }
                        }
                    }
                } catch (expenseError) {
                    console.error(`Error processing expense ${expense.id}:`, expenseError.message);
                }
            }

            // Calculate final balances with rounding
            const finalBalances = {};
            for (const [person, data] of Object.entries(balances)) {
                const paid = roundMoney(data.paid);
                const owes = roundMoney(data.owes);
                const balance = roundMoney(paid - owes);

                finalBalances[person] = {
                    paid,
                    owes,
                    balance
                };
            }

            return finalBalances;

        } catch (error) {
            console.error('Error in calculateBalances:', error);
            throw new Error(`Failed to calculate balances: ${error.message}`);
        }
    },

    async calculateSettlements() {
        try {
            const balances = await this.calculateBalances();
            const settlements = [];

            // Separate people who owe money vs those who are owed money
            const peopleWhoOwe = [];
            const peopleOwed = [];

            for (const [person, data] of Object.entries(balances)) {
                const balance = data.balance;

                if (balance < -0.01) {
                    // Person owes money (negative balance)
                    peopleWhoOwe.push({
                        person,
                        amount: roundMoney(Math.abs(balance))
                    });
                } else if (balance > 0.01) {
                    // Person is owed money (positive balance)
                    peopleOwed.push({
                        person,
                        amount: roundMoney(balance)
                    });
                }
            }

            // Sort by amount (largest first)
            peopleWhoOwe.sort((a, b) => b.amount - a.amount);
            peopleOwed.sort((a, b) => b.amount - a.amount);

            // Create settlements
            let oweIndex = 0;
            let owedIndex = 0;
            let iterations = 0;
            const maxIterations = 100; // Safety limit

            while (oweIndex < peopleWhoOwe.length &&
                owedIndex < peopleOwed.length &&
                iterations < maxIterations) {

                iterations++;

                const debtor = peopleWhoOwe[oweIndex];
                const creditor = peopleOwed[owedIndex];

                if (!debtor || !creditor || debtor.amount <= 0 || creditor.amount <= 0) {
                    break;
                }

                const settlementAmount = roundMoney(Math.min(debtor.amount, creditor.amount));

                if (settlementAmount > 0.01) {
                    settlements.push({
                        from: debtor.person,
                        to: creditor.person,
                        amount: settlementAmount
                    });

                    debtor.amount = roundMoney(debtor.amount - settlementAmount);
                    creditor.amount = roundMoney(creditor.amount - settlementAmount);
                }

                // Move to next person if current debt/credit is settled
                if (debtor.amount <= 0.01) {
                    oweIndex++;
                }
                if (creditor.amount <= 0.01) {
                    owedIndex++;
                }
            }

            return settlements;

        } catch (error) {
            console.error('Error in calculateSettlements:', error);
            throw new Error(`Failed to calculate settlements: ${error.message}`);
        }
    },

    async getExpenseSummary() {
        try {
            const expenses = await prisma.expense.findMany();
            let totalAmount = 0;
            let validExpenseCount = 0;

            for (const expense of expenses) {
                const amount = parseFloat(expense.amount);
                if (!isNaN(amount) && amount > 0) {
                    totalAmount += amount;
                    validExpenseCount++;
                }
            }

            const people = await this.getAllPeople();

            return {
                totalExpenses: validExpenseCount,
                totalAmount: roundMoney(totalAmount),
                totalPeople: people.length,
                averageExpense: validExpenseCount > 0 ? roundMoney(totalAmount / validExpenseCount) : 0
            };

        } catch (error) {
            console.error('Error in getExpenseSummary:', error);
            throw new Error(`Failed to get expense summary: ${error.message}`);
        }
    },

    async getAllPeople() {
        try {
            const expenses = await prisma.expense.findMany();
            const peopleSet = new Set();

            for (const expense of expenses) {
                // Add person who paid
                const paidBy = String(expense.paidBy || '').trim();
                if (paidBy) {
                    peopleSet.add(paidBy);
                }

                // Add participants
                if (Array.isArray(expense.participants)) {
                    expense.participants.forEach(participant => {
                        const person = String(participant || '').trim();
                        if (person) {
                            peopleSet.add(person);
                        }
                    });
                }
            }

            return Array.from(peopleSet).sort();

        } catch (error) {
            console.error('Error in getAllPeople:', error);
            throw new Error(`Failed to get all people: ${error.message}`);
        }
    }
};

export default settlementService;