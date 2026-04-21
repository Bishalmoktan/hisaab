import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGroupById } from '@/lib/services/groups';
import { ExpenseForm } from '@/components/expenses/expense-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function NewExpensePage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const group = await getGroupById(params.id);
  if (!group) notFound();

  const isMember = group.members.some((m) => m.user_id === user.id);
  if (!isMember) redirect('/dashboard');

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/groups/${group.id}`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {group.name}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Add Expense</h1>
        <p className="text-slate-500 mt-0.5">
          Manually assign each person&apos;s share of the bill
        </p>
      </div>

      <ExpenseForm
        groupId={group.id}
        groupName={group.name}
        members={group.members.map((m) => m.user)}
        currentUserId={user.id}
      />
    </div>
  );
}
