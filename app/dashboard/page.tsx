import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserGroups } from '@/lib/services/groups';
import { getRecentExpenses } from '@/lib/services/expenses';
import { calculateUserBalances } from '@/lib/services/balances';
import { formatCurrency } from '@/lib/services/balances';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import type { User } from '@/lib/types';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  const user: User = profile ?? {
    id: authUser.id,
    name: authUser.user_metadata?.full_name ?? 'User',
    email: authUser.email ?? '',
    avatar_url: authUser.user_metadata?.avatar_url ?? null,
    created_at: new Date().toISOString(),
  };

  const [groups, allExpenses, recentExpenses] = await Promise.all([
    getUserGroups(),
    getRecentExpenses(9999), // Fetch all expenses for accurate balance calculation
    getRecentExpenses(8), // Limit display to 8 recent expenses
  ]);

  // Get all unique users from all expenses
  const allUsers = new Map<string, User>();
  allExpenses.forEach((e) => {
    allUsers.set(e.payer.id, e.payer);
    e.splits.forEach((s) => allUsers.set(s.user.id, s.user));
  });

  const balances = calculateUserBalances(allExpenses, Array.from(allUsers.values()));
  const myBalance = balances.find((b) => b.userId === user.id);

  return (
    <DashboardClient
      user={user}
      groups={groups}
      recentExpenses={recentExpenses}
      myBalance={myBalance ?? null}
    />
  );
}
