import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getExpenseById } from '@/lib/services/expenses';
import { ExpenseDetailClient } from '@/components/expenses/expense-detail-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const expense = await getExpenseById(params.id);
  if (!expense) notFound();

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/groups/${expense.group_id}`}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Group
        </Link>
      </div>

      <ExpenseDetailClient expense={expense} currentUserId={user.id} />
    </div>
  );
}
