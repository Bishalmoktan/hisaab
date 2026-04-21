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

  const [groups, recentExpenses] = await Promise.all([
    getUserGroups(),
    getRecentExpenses(8),
  ]);

  // Get all unique users from expenses
  const allUsers = new Map<string, User>();
  recentExpenses.forEach((e) => {
    allUsers.set(e.payer.id, e.payer);
    e.splits.forEach((s) => allUsers.set(s.user.id, s.user));
  });

  const balances = calculateUserBalances(recentExpenses, Array.from(allUsers.values()));
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
