'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { format } from 'date-fns';
import type { ExpenseWithDetails } from '@/lib/types';
import { formatCurrency } from '@/lib/services/balances';
import { markSplitAsPaid, approveSplit, rejectSplit, deleteExpense } from '@/lib/services/expenses';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Calendar, Receipt, CircleCheck as CheckCircle, Circle as XCircle, Clock, Trash2, Loader as Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  expense: ExpenseWithDetails;
  currentUserId: string;
}

const statusConfig = {
  pending: { label: 'Pending', className: 'bg-orange-100 text-orange-700', icon: Clock },
  paid: { label: 'Awaiting Approval', className: 'bg-yellow-100 text-yellow-700', icon: CreditCard },
  approved: { label: 'Settled', className: 'bg-green-100 text-green-700', icon: CheckCircle },
};

export function ExpenseDetailClient({ expense, currentUserId }: Props) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  useRealtimeRefresh([{ table: 'expense_splits', filter: `expense_id=eq.${expense.id}` }]);
  const iAmPayer = expense.paid_by === currentUserId;
  const mySplit = expense.splits.find((s) => s.user_id === currentUserId);

  const totalSplits = expense.splits.reduce((sum, s) => sum + Number(s.amount_owed), 0);
  const settledAmount = expense.splits
    .filter((s) => s.status === 'approved')
    .reduce((sum, s) => sum + Number(s.amount_owed), 0);
  const pendingAmount = expense.splits
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + Number(s.amount_owed), 0);

  const handleMarkPaid = async (splitId: string) => {
    setLoadingAction(`pay-${splitId}`);
    const result = await markSplitAsPaid(splitId, expense.id);
    if (!result.success) {
      toast.error(result.message || "Failed to mark as paid");
      setLoadingAction(null);
      return;
    }
    toast.success("Marked as paid! Waiting for approval.");
    router.refresh();
    setLoadingAction(null);
  };

  const handleApprove = async (splitId: string) => {
    setLoadingAction(`approve-${splitId}`);
    const result = await approveSplit(splitId, expense.id);
    if (!result.success) {
      toast.error(result.message || "Failed to approve");
      setLoadingAction(null);
      return;
    }
    toast.success("Payment approved!");
    router.refresh();
    setLoadingAction(null);
  };

  const handleReject = async (splitId: string) => {
    setLoadingAction(`reject-${splitId}`);
    const result = await rejectSplit(splitId, expense.id);
    if (!result.success) {
      toast.error(result.message || "Failed to reject");
      setLoadingAction(null);
      return;
    }
    toast.success("Payment rejected — marked as pending again");
    router.refresh();
    setLoadingAction(null);
  };

  const handleDelete = async () => {
    setLoadingAction("delete");
    const result = await deleteExpense(expense.id, expense.group_id);
    if (!result.success) {
      toast.error(result.message || "Failed to delete");
      setLoadingAction(null);
      return;
    }
    toast.success("Expense deleted");
    router.push(`/groups/${expense.group_id}`);
  };

  return (
    <div className="space-y-6">
      {/* Expense Header */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{expense.title}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(expense.date), 'MMMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-slate-900">
                {formatCurrency(expense.total_amount)}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                Paid by{' '}
                <span className="font-medium text-slate-700">
                  {iAmPayer ? 'you' : expense.payer.name}
                </span>
              </div>
            </div>
          </div>

          {expense.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500">{expense.notes}</p>
            </div>
          )}

          {/* Summary bars */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <div className="font-bold text-slate-900">{formatCurrency(expense.total_amount)}</div>
              <div className="text-xs text-slate-400">Total</div>
            </div>
            <div>
              <div className="font-bold text-green-600">{formatCurrency(settledAmount)}</div>
              <div className="text-xs text-slate-400">Settled</div>
            </div>
            <div>
              <div className="font-bold text-orange-600">{formatCurrency(pendingAmount)}</div>
              <div className="text-xs text-slate-400">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Action (if I'm not the payer and have a pending split) */}
      {mySplit && !iAmPayer && mySplit.status === 'pending' && (
        <Card className="border-2 border-blue-200 bg-blue-50/50 shadow-none">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Your share: {formatCurrency(Number(mySplit.amount_owed))}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                Mark as paid once you&apos;ve sent the money to {expense.payer.name}
              </div>
            </div>
            <Button
              onClick={() => handleMarkPaid(mySplit.id)}
              disabled={loadingAction === `pay-${mySplit.id}`}
              className="shrink-0 bg-blue-600 hover:bg-blue-700"
            >
              {loadingAction === `pay-${mySplit.id}` ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Mark as Paid
            </Button>
          </CardContent>
        </Card>
      )}

      {mySplit && !iAmPayer && mySplit.status === 'paid' && (
        <Card className="border-2 border-yellow-200 bg-yellow-50/50 shadow-none">
          <CardContent className="p-4">
            <div className="font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-600" />
              Awaiting payment confirmation from {expense.payer.name}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              Your payment of {formatCurrency(Number(mySplit.amount_owed))} is waiting for approval.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Splits List */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-base">Split Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {expense.splits.map((split) => {
            const config = statusConfig[split.status];
            const StatusIcon = config.icon;
            const isMe = split.user_id === currentUserId;
            const isPayerApproving = iAmPayer && split.status === 'paid';

            return (
              <div key={split.id} className="px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={split.user.avatar_url ?? undefined} />
                      <AvatarFallback className="text-sm bg-slate-100 text-slate-600 font-semibold">
                        {split.user.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-slate-900 flex items-center gap-1.5">
                        {split.user.name}
                        {isMe && <span className="text-xs text-slate-400 font-normal">(you)</span>}
                        {split.user_id === expense.paid_by && (
                          <Badge variant="secondary" className="text-xs">Payer</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {split.status === 'approved' && split.approved_at &&
                          `Approved ${format(new Date(split.approved_at), 'MMM d')}`}
                        {split.status === 'paid' && split.paid_at &&
                          `Paid ${format(new Date(split.paid_at), 'MMM d')} – awaiting approval`}
                        {split.status === 'pending' && 'Not yet paid'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">
                        {formatCurrency(Number(split.amount_owed))}
                      </div>
                      <div className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5', config.className)}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </div>
                    </div>

                    {/* Payer approval actions */}
                    {isPayerApproving && (
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-green-700 border-green-200 hover:bg-green-50"
                          onClick={() => handleApprove(split.id)}
                          disabled={loadingAction === `approve-${split.id}`}
                        >
                          {loadingAction === `approve-${split.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <CheckCircle className="w-3.5 h-3.5" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1 text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => handleReject(split.id)}
                          disabled={loadingAction === `reject-${split.id}`}
                        >
                          {loadingAction === `reject-${split.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Delete Button (payer only) */}
      {iAmPayer && (
        <div className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
                Delete Expense
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &ldquo;{expense.title}&rdquo; and all associated splits.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {loadingAction === 'delete' ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
