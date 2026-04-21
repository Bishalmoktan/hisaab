import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGroupById } from '@/lib/services/groups';
import { getGroupExpenses } from '@/lib/services/expenses';
import { calculateUserBalances, calculatePairwiseDebts } from '@/lib/services/balances';
import { GroupDetailClient } from '@/components/groups/group-detail-client';

export default async function GroupPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [group, expenses] = await Promise.all([
    getGroupById(params.id),
    getGroupExpenses(params.id),
  ]);

  if (!group) notFound();

  const isMember = group.members.some((m) => m.user_id === user.id);
  if (!isMember) redirect('/dashboard');

  const allUsers = group.members.map((m) => m.user);
  const balances = calculateUserBalances(expenses, allUsers);
  const pairwiseDebts = calculatePairwiseDebts(expenses);

  return (
    <GroupDetailClient
      group={group}
      expenses={expenses}
      balances={balances}
      pairwiseDebts={pairwiseDebts}
      currentUserId={user.id}
    />
  );
}
