import { Expense, User, Settlement } from '../types';

export function calculateBalances(expenses: Expense[], users: User[], onlyUnsettled: boolean = false) {
  // balances[userId] = amount (positive means they are owed money, negative means they owe money)
  const balances: Record<string, number> = {};
  
  users.forEach(u => balances[u.id] = 0);

  const activeExpenses = onlyUnsettled ? expenses.filter(e => !e.isSettled) : expenses;

  activeExpenses.forEach(expense => {
    const involvedIds = expense.involvedUserIds || users.map(u => u.id);
    const splitAmount = expense.amount / involvedIds.length;
    
    // The person who paid gets the total amount added to their balance
    if (balances[expense.paidById] !== undefined) {
       balances[expense.paidById] += expense.amount;
    }
    
    // Everyone involved gets their share subtracted
    involvedIds.forEach(id => {
       if (balances[id] !== undefined) {
         balances[id] -= splitAmount;
       }
    });
  });

  return balances;
}

export function calculateSettlements(balances: Record<string, number>, users: User[]): Settlement[] {
  const debtors = users
    .filter(u => balances[u.id] < -0.01)
    .map(u => ({ user: u, amount: Math.abs(balances[u.id]) }))
    .sort((a, b) => b.amount - a.amount);
    
  const creditors = users
    .filter(u => balances[u.id] > 0.01)
    .map(u => ({ user: u, amount: balances[u.id] }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];

  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.01) {
      settlements.push({
        fromUser: debtor.user,
        toUser: creditor.user,
        amount: amount
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return settlements;
}

export function calculateCategoryTotals(expenses: Expense[], categoryId: string): number {
  return expenses
    .filter(e => e.categoryId === categoryId)
    .reduce((sum, e) => sum + e.amount, 0);
}
