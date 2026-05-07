'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type {
  GroupWithMembers,
  ExpenseWithDetails,
  UserNetBalance,
  PairwiseDebt,
} from '@/lib/types';
import { formatCurrency } from '@/lib/services/balances';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InviteMemberModal } from '@/components/groups/invite-member-modal';
import {
  markDebtAsPaidForUser,
  approveDebtPaymentsFromUser,
} from '@/lib/services/expenses';
import {
  Plus,
  Receipt,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Crown,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface Props {
  group: GroupWithMembers;
  expenses: ExpenseWithDetails[];
  balances: UserNetBalance[];
  pairwiseDebts: PairwiseDebt[];
  currentUserId: string;
}

export function GroupDetailClient({ group, expenses, balances, pairwiseDebts, currentUserId }: Props) {
  useRealtimeRefresh([
    { table: 'expenses', filter: `group_id=eq.${group.id}` },
    { table: 'expense_splits' },
  ]);

  const { toast } = useToast();
  const [loadingDebtUsers, setLoadingDebtUsers] = useState<Set<string>>(new Set());
  const [loadingOwedUsers, setLoadingOwedUsers] = useState<Set<string>>(new Set());

  const myRole = group.members.find((m) => m.user_id === currentUserId)?.role;
  const isAdmin = myRole === 'admin';
  const myBalance = balances.find((b) => b.userId === currentUserId);

  const myDebts = pairwiseDebts.filter((d) => d.fromUserId === currentUserId);
  const owedToMe = pairwiseDebts.filter((d) => d.toUserId === currentUserId);

  const getUserName = (userId: string) => {
    const member = group.members.find((m) => m.user_id === userId);
    return member?.user.name ?? 'Unknown';
  };

  const handleMarkAsPaidForUser = async (toUserId: string) => {
    setLoadingDebtUsers((prev) => new Set(prev).add(toUserId));
    try {
      const result = await markDebtAsPaidForUser(group.id, toUserId);
      if (result.success) {
        toast({
          title: 'Success',
          description: `Marked ${result.count} expense${result.count !== 1 ? 's' : ''} as paid`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to mark expenses as paid',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoadingDebtUsers((prev) => {
        const next = new Set(prev);
        next.delete(toUserId);
        return next;
      });
    }
  };

  const handleApprovePaymentsFromUser = async (fromUserId: string) => {
    setLoadingOwedUsers((prev) => new Set(prev).add(fromUserId));
    try {
      const result = await approveDebtPaymentsFromUser(group.id, fromUserId);
      if (result.success) {
        toast({
          title: 'Success',
          description: `Approved ${result.count} expense${result.count !== 1 ? 's' : ''} payment${result.count !== 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to approve expenses',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoadingOwedUsers((prev) => {
        const next = new Set(prev);
        next.delete(fromUserId);
        return next;
      });
    }
  };

  // Helper function to get status for a user in "You owe"
  const getMyDebtStatusWithUser = (toUserId: string) => {
    const userExpenses = expenses.filter((e) => e.paid_by === toUserId);
    const mySplits = userExpenses.flatMap((e) => 
      e.splits.filter((s) => s.user_id === currentUserId)
    );

    if (mySplits.length === 0) return null;

    // If any are pending, show pending
    if (mySplits.some((s) => s.status === 'pending')) return 'pending';
    // If any are paid, show paid
    if (mySplits.some((s) => s.status === 'paid')) return 'paid';
    // Otherwise all approved
    return 'approved';
  };

  // Helper function to get status for a user in "Owed to me"
  const getOwedToMeStatusFromUser = (fromUserId: string) => {
    const userExpenses = expenses.filter((e) => e.paid_by === currentUserId);
    const theirSplits = userExpenses.flatMap((e) =>
      e.splits.filter((s) => s.user_id === fromUserId)
    );

    if (theirSplits.length === 0) return null;

    // If any are pending, show pending
    if (theirSplits.some((s) => s.status === 'pending')) return 'pending';
    // If any are paid, show paid (awaiting approval)
    if (theirSplits.some((s) => s.status === 'paid')) return 'paid';
    // Otherwise all approved
    return 'approved';
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="destructive" className="text-xs bg-red-100 text-red-700">
            Pending
          </Badge>
        );
      case 'paid':
        return (
          <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
            Awaiting approval
          </Badge>
        );
      case 'approved':
        return (
          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
            Settled
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3 sm:gap-4 min-w-0">
          <div className="w-12 sm:w-14 h-12 sm:h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-2xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-md shrink-0">
            {group.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{group.name}</h1>
            {group.description && (
              <p className="text-sm sm:text-base text-slate-500 mt-0.5 line-clamp-2">{group.description}</p>
            )}
            <div className="flex items-center gap-1 sm:gap-1.5 mt-1 flex-wrap">
              <Users className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs sm:text-sm text-slate-500">{group.members.length} members</span>
              {isAdmin && <Badge variant="secondary" className="text-xs ml-1">Admin</Badge>}
            </div>
          </div>
        </div>
        <Link href={`/groups/${group.id}/expenses/new`} className="shrink-0 w-full sm:w-auto">
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Expense</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </Link>
      </div>

      {/* Balance Summary */}
      {myBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs font-medium text-slate-500 mb-1">You Owe in Group</div>
              <div className="text-lg sm:text-xl font-bold text-red-600">
                {formatCurrency(myBalance.totalOwed)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs font-medium text-slate-500 mb-1">Owed to You</div>
              <div className="text-lg sm:text-xl font-bold text-green-600">
                {formatCurrency(myBalance.totalToReceive)}
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            'border-0 shadow-sm',
            myBalance.netBalance > 0 ? 'bg-green-50' : myBalance.netBalance < 0 ? 'bg-red-50' : 'bg-slate-50'
          )}>
            <CardContent className="p-3 sm:p-4">
              <div className="text-xs font-medium text-slate-500 mb-1">Net Balance</div>
              <div className={cn(
                'text-lg sm:text-xl font-bold',
                myBalance.netBalance > 0 ? 'text-green-700' : myBalance.netBalance < 0 ? 'text-red-700' : 'text-slate-500'
              )}>
                {myBalance.netBalance >= 0 ? '+' : ''}{formatCurrency(myBalance.netBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Debts Section */}
      {(myDebts.length > 0 || owedToMe.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {myDebts.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  You owe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {myDebts.map((debt) => {
                  const status = getMyDebtStatusWithUser(debt.toUserId);
                  return (
                    <div key={`${debt.fromUserId}-${debt.toUserId}`} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className="text-xs bg-red-100 text-red-700">
                              {getUserName(debt.toUserId)[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm text-slate-700 truncate">{getUserName(debt.toUserId)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-semibold text-red-600">
                            {formatCurrency(debt.amount)}
                          </span>
                          {status === "pending" && <Button
                            onClick={() => handleMarkAsPaidForUser(debt.toUserId)}
                            disabled={loadingDebtUsers.has(debt.toUserId)}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-xs h-7 px-2 sm:h-8 sm:px-3"
                            size="sm"
                          >
                            {loadingDebtUsers.has(debt.toUserId) ? (
                              <span>...</span>
                            ) : (
                              <span className="hidden sm:inline">Request</span>
                            )}
                            <span className="sm:hidden">✓</span>
                          </Button>}
                        </div>
                      </div>
                      {status && (
                        <div className="flex justify-end">
                          {getStatusBadge(status)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {owedToMe.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Owed to you
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {owedToMe.map((debt) => {
                  const status = getOwedToMeStatusFromUser(debt.fromUserId);
                  const shouldShowApprove = status === 'paid';
                  return (
                    <div key={`${debt.fromUserId}-${debt.toUserId}`} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Avatar className="w-6 h-6 shrink-0">
                            <AvatarFallback className="text-xs bg-green-100 text-green-700">
                              {getUserName(debt.fromUserId)[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm text-slate-700 truncate">{getUserName(debt.fromUserId)}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs sm:text-sm font-semibold text-green-600">
                            {formatCurrency(debt.amount)}
                          </span>
                          {shouldShowApprove && (
                            <Button
                              onClick={() => handleApprovePaymentsFromUser(debt.fromUserId)}
                              disabled={loadingOwedUsers.has(debt.fromUserId)}
                              className="bg-green-600 hover:bg-green-700 text-xs h-7 px-2 sm:h-8 sm:px-3"
                              size="sm"
                            >
                              {loadingOwedUsers.has(debt.fromUserId) ? (
                                <span>...</span>
                              ) : (
                                <span className="hidden sm:inline">Approve</span>
                              )}
                              <span className="sm:hidden">✓</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      {status && (
                        <div className="flex justify-end">
                          {getStatusBadge(status)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs: Expenses | Members */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="bg-slate-100 w-full grid grid-cols-3">
          <TabsTrigger value="expenses" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Expenses</span>
            <span className="sm:hidden">({expenses.length})</span>
            <span className="hidden sm:inline">({expenses.length})</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-1 sm:gap-2 text-xs sm:text-sm">
            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Members</span>
            <span className="sm:hidden">({group.members.length})</span>
            <span className="hidden sm:inline">({group.members.length})</span>
          </TabsTrigger>
          <TabsTrigger value="balances" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">All Balances</span>
            <span className="sm:hidden">Balances</span>
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
          {expenses.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-200 bg-transparent shadow-none">
              <CardContent className="p-6 sm:p-12 text-center">
                <Receipt className="w-8 sm:w-10 h-8 sm:h-10 text-slate-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-slate-500 font-medium text-sm sm:text-base mb-1">No expenses yet</p>
                <p className="text-slate-400 text-xs sm:text-sm mb-4">Be the first to add an expense</p>
                <Link href={`/groups/${group.id}/expenses/new`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Add First Expense
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            expenses.map((expense) => {
              const mySplit = expense.splits.find((s) => s.user_id === currentUserId);
              const iAmPayer = expense.paid_by === currentUserId;
              const pendingCount = expense.splits.filter((s) => s.status === 'pending').length;
              const paidCount = expense.splits.filter((s) => s.status === 'paid').length;

              return (
                <Link key={expense.id} href={`/expenses/${expense.id}`}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2 sm:gap-4">
                        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 sm:w-10 h-8 sm:h-10 bg-slate-100 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                            <Receipt className="w-4 sm:w-5 h-4 sm:h-5 text-slate-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                              {expense.title}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5 flex-wrap">
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{format(new Date(expense.date), 'MMM d, yyyy')}</span>
                              <span className="hidden sm:inline">·</span>
                              <span className="hidden sm:inline">paid by</span>
                              <span>{iAmPayer ? 'you' : expense.payer.name.split(' ')[0]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <div className="font-semibold text-sm sm:text-base text-slate-900">
                            {formatCurrency(expense.total_amount)}
                          </div>
                          <div className="flex gap-1 mt-1 flex-wrap justify-end">
                            {pendingCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {pendingCount} pending
                              </Badge>
                            )}
                            {paidCount > 0 && (
                              <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-700">
                                {paidCount} awaiting
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {mySplit && !iAmPayer && (
                        <div className={cn(
                          'mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between text-xs sm:text-sm',
                        )}>
                          <span className="text-slate-500">Your share:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{formatCurrency(Number(mySplit.amount_owed))}</span>
                            <Badge
                              variant={
                                mySplit.status === 'approved' ? 'secondary' :
                                mySplit.status === 'paid' ? 'secondary' : 'destructive'
                              }
                              className={cn(
                                'text-xs',
                                mySplit.status === 'approved' && 'bg-green-100 text-green-700',
                                mySplit.status === 'paid' && 'bg-yellow-100 text-yellow-700',
                              )}
                            >
                              {mySplit.status === 'approved' ? 'Settled' :
                               mySplit.status === 'paid' ? 'Awaiting approval' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-3 sm:mt-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="divide-y divide-slate-100 p-0">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Avatar className="w-8 sm:w-9 h-8 sm:h-9 shrink-0">
                      <AvatarImage src={member.user.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold text-sm">
                        {member.user.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-medium text-sm sm:text-base text-slate-900 flex items-center gap-2 flex-wrap">
                        <span className="truncate">{member.user.name}</span>
                        {member.user_id === currentUserId && (
                          <span className="text-xs text-slate-400 shrink-0">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{member.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {member.role === 'admin' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Crown className="w-3 h-3" />
                        <span className="hidden sm:inline">Admin</span>
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {isAdmin && (
            <div className="mt-3 sm:mt-4">
              <InviteMemberModal groupId={group.id} />
            </div>
          )}
        </TabsContent>

        {/* All Balances Tab */}
        <TabsContent value="balances" className="mt-3 sm:mt-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-2 sm:pb-4">
              <CardTitle className="text-sm sm:text-base">Balance Summary</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 p-0">
              {balances.map((b) => (
                <div key={b.userId} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={b.user.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                        {b.user.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-slate-900">
                      {b.user.name}
                      {b.userId === currentUserId && <span className="text-slate-400 ml-1 font-normal text-sm">(you)</span>}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      'font-semibold',
                      b.netBalance > 0 ? 'text-green-600' : b.netBalance < 0 ? 'text-red-600' : 'text-slate-400'
                    )}>
                      {b.netBalance >= 0 ? '+' : ''}{formatCurrency(b.netBalance)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {b.netBalance > 0 ? 'to receive' : b.netBalance < 0 ? 'to pay' : 'settled'}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
