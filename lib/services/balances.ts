import type { ExpenseWithDetails, PairwiseDebt, User, UserNetBalance } from '@/lib/types';

export function calculateUserBalances(
  expenses: ExpenseWithDetails[],
  users: User[]
): UserNetBalance[] {
  const balanceMap = new Map<string, { owed: number; toReceive: number }>();

  users.forEach((u) => balanceMap.set(u.id, { owed: 0, toReceive: 0 }));

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.status === 'approved') continue;
      if (split.user_id === expense.paid_by) continue;

      const amount = Number(split.amount_owed);
      const payerId = expense.paid_by;
      const debtorId = split.user_id;

      if (!balanceMap.has(debtorId)) balanceMap.set(debtorId, { owed: 0, toReceive: 0 });
      if (!balanceMap.has(payerId)) balanceMap.set(payerId, { owed: 0, toReceive: 0 });

      balanceMap.get(debtorId)!.owed += amount;
      balanceMap.get(payerId)!.toReceive += amount;
    }
  }

  return users.map((user) => {
    const bal = balanceMap.get(user.id) ?? { owed: 0, toReceive: 0 };
    return {
      userId: user.id,
      user,
      totalOwed: bal.owed,
      totalToReceive: bal.toReceive,
      netBalance: bal.toReceive - bal.owed,
    };
  });
}

export function calculatePairwiseDebts(expenses: ExpenseWithDetails[]): PairwiseDebt[] {
  // net[fromId][toId] = amount fromId owes toId
  const net = new Map<string, Map<string, number>>();

  const add = (from: string, to: string, amount: number) => {
    if (!net.has(from)) net.set(from, new Map());
    if (!net.has(to)) net.set(to, new Map());

    const existing = net.get(from)!.get(to) ?? 0;
    const reverse = net.get(to)!.get(from) ?? 0;

    if (reverse > 0) {
      const newNet = reverse - amount;
      if (newNet > 0.001) {
        net.get(to)!.set(from, newNet);
        net.get(from)!.delete(to);
      } else if (newNet < -0.001) {
        net.get(to)!.delete(from);
        net.get(from)!.set(to, Math.abs(newNet));
      } else {
        net.get(to)!.delete(from);
        net.get(from)!.delete(to);
      }
    } else {
      net.get(from)!.set(to, existing + amount);
    }
  };

  for (const expense of expenses) {
    for (const split of expense.splits) {
      if (split.status === 'approved') continue;
      if (split.user_id === expense.paid_by) continue;
      add(split.user_id, expense.paid_by, Number(split.amount_owed));
    }
  }

  const debts: PairwiseDebt[] = [];
  net.forEach((toMap, fromId) => {
    toMap.forEach((amount, toId) => {
      if (amount > 0.001) {
        debts.push({ fromUserId: fromId, toUserId: toId, amount });
      }
    });
  });

  return debts;
}

// Simplify debts using a greedy algorithm to minimize transactions
export function simplifyDebts(pairwiseDebts: PairwiseDebt[]): PairwiseDebt[] {
  const netBalance = new Map<string, number>();

  pairwiseDebts.forEach(({ fromUserId, toUserId, amount }) => {
    netBalance.set(fromUserId, (netBalance.get(fromUserId) ?? 0) - amount);
    netBalance.set(toUserId, (netBalance.get(toUserId) ?? 0) + amount);
  });

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  netBalance.forEach((balance, userId) => {
    if (balance > 0.001) creditors.push({ id: userId, amount: balance });
    else if (balance < -0.001) debtors.push({ id: userId, amount: Math.abs(balance) });
  });

  const simplified: PairwiseDebt[] = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0.001) {
      simplified.push({ fromUserId: debtor.id, toUserId: creditor.id, amount });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount < 0.001) i++;
    if (creditor.amount < 0.001) j++;
  }

  return simplified;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}
