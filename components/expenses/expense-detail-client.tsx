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
    <div className="space-y-4 sm:space-y-6">
      {/* Expense Header */}
      <Card className="border-0 shadow-sm bg-white">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-2 sm:gap-3 min-w-0">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-blue-100 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <Receipt className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{expense.title}</h1>
                <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(expense.date), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">
                {formatCurrency(expense.total_amount)}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-0.5">
                <span className="hidden sm:inline">Paid by </span>
                <span className="font-medium text-slate-700">
                  {iAmPayer ? 'you' : expense.payer.name.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>

          {expense.notes && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
              <p className="text-xs sm:text-sm text-slate-500">{expense.notes}</p>
            </div>
          )}

          {/* Summary bars */}
          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 sm:gap-4 text-center text-xs sm:text-sm">
            <div>
              <div className="font-bold text-slate-900">{formatCurrency(expense.total_amount)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total</div>
            </div>
            <div>
              <div className="font-bold text-green-600">{formatCurrency(settledAmount)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Settled</div>
            </div>
            <div>
              <div className="font-bold text-orange-600">{formatCurrency(pendingAmount)}</div>
              <div className="text-xs text-slate-400 mt-0.5">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Action (if I'm not the payer and have a pending split) */}
      {mySplit && !iAmPayer && mySplit.status === 'pending' && (
        <Card className="border-2 border-blue-200 bg-blue-50/50 shadow-none">
          <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                Your share: {formatCurrency(Number(mySplit.amount_owed))}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Mark as paid once you send the money
              </div>
            </div>
            <Button
              onClick={() => handleMarkPaid(mySplit.id)}
              disabled={loadingAction === `pay-${mySplit.id}`}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-sm"
            >
              {loadingAction === `pay-${mySplit.id}` ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Mark Paid
            </Button>
          </CardContent>
        </Card>
      )}

      {mySplit && !iAmPayer && mySplit.status === 'paid' && (
        <Card className="border-2 border-yellow-200 bg-yellow-50/50 shadow-none">
          <CardContent className="p-3 sm:p-4">
            <div className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 h-4 text-yellow-600 shrink-0" />
              Awaiting confirmation
            </div>
            <div className="text-xs sm:text-sm text-slate-500 mt-1">
              Your payment of {formatCurrency(Number(mySplit.amount_owed))} is waiting for approval from {expense.payer.name.split(' ')[0]}.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Splits List */}
      <Card className="border-0 shadow-sm bg-white">
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="text-sm sm:text-base">Split Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0">
          {expense.splits.map((split) => {
            const config = statusConfig[split.status];
            const StatusIcon = config.icon;
            const isMe = split.user_id === currentUserId;
            const isPayerApproving = iAmPayer && split.status === 'paid';

            return (
              <div key={split.id} className="px-3 sm:px-4 py-3 sm:py-4">
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                    <Avatar className="w-8 sm:w-9 h-8 sm:h-9 shrink-0 mt-0.5">
                      <AvatarImage src={split.user.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs sm:text-sm bg-slate-100 text-slate-600 font-semibold">
                        {split.user.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-xs sm:text-base text-slate-900 flex items-center gap-1 flex-wrap">
                        <span className="truncate">{split.user.name}</span>
                        {isMe && <span className="text-xs text-slate-400 font-normal">(you)</span>}
                        {split.user_id === expense.paid_by && (
                          <Badge variant="secondary" className="text-xs">Payer</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {split.status === 'approved' && split.approved_at &&
                          `Approved ${format(new Date(split.approved_at), 'MMM d')}`}
                        {split.status === 'paid' && split.paid_at &&
                          `Paid ${format(new Date(split.paid_at), 'MMM d')} – awaiting`}
                        {split.status === 'pending' && 'Not yet paid'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right sm:text-right">
                      <div className="font-semibold text-sm sm:text-base text-slate-900">
                        {formatCurrency(Number(split.amount_owed))}
                      </div>
                      <div className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5', config.className)}>
                        <StatusIcon className="w-3 h-3" />
                        <span className="hidden sm:inline">{config.label}</span>
                        <span className="sm:hidden text-xs">{config.label.split(' ')[0]}</span>
                      </div>
                    </div>

                    {/* Payer approval actions */}
                    {isPayerApproving && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-green-700 border-green-200 hover:bg-green-50 text-xs"
                          onClick={() => handleApprove(split.id)}
                          disabled={loadingAction === `approve-${split.id}`}
                          title="Approve"
                        >
                          {loadingAction === `approve-${split.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">Approve</span>
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 sm:h-8 px-2 sm:px-3 gap-1 text-red-700 border-red-200 hover:bg-red-50 text-xs"
                          onClick={() => handleReject(split.id)}
                          disabled={loadingAction === `reject-${split.id}`}
                          title="Reject"
                        >
                          {loadingAction === `reject-${split.id}` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span className="hidden sm:inline">Reject</span>
                            </>
                          )}
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
              <Button variant="outline" className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 text-sm">
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete Expense</span>
                <span className="sm:hidden">Delete</span>
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
