'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
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

  const myRole = group.members.find((m) => m.user_id === currentUserId)?.role;
  const isAdmin = myRole === 'admin';
  const myBalance = balances.find((b) => b.userId === currentUserId);

  const myDebts = pairwiseDebts.filter((d) => d.fromUserId === currentUserId);
  const owedToMe = pairwiseDebts.filter((d) => d.toUserId === currentUserId);

  const getUserName = (userId: string) => {
    const member = group.members.find((m) => m.user_id === userId);
    return member?.user.name ?? 'Unknown';
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {group.name[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{group.name}</h1>
            {group.description && (
              <p className="text-slate-500 mt-0.5">{group.description}</p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm text-slate-500">{group.members.length} members</span>
              {isAdmin && <Badge variant="secondary" className="text-xs ml-1">Admin</Badge>}
            </div>
          </div>
        </div>
        <Link href={`/groups/${group.id}/expenses/new`}>
          <Button className="gap-2 bg-blue-600 hover:bg-blue-700 shrink-0">
            <Plus className="w-4 h-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      {/* Balance Summary */}
      {myBalance && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-slate-500 mb-1">You Owe in Group</div>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(myBalance.totalOwed)}
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-4">
              <div className="text-xs font-medium text-slate-500 mb-1">Owed to You</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(myBalance.totalToReceive)}
              </div>
            </CardContent>
          </Card>
          <Card className={cn(
            'border-0 shadow-sm',
            myBalance.netBalance > 0 ? 'bg-green-50' : myBalance.netBalance < 0 ? 'bg-red-50' : 'bg-slate-50'
          )}>
            <CardContent className="p-4">
              <div className="text-xs font-medium text-slate-500 mb-1">Net Balance</div>
              <div className={cn(
                'text-xl font-bold',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {myDebts.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  You owe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {myDebts.map((debt) => (
                  <div key={`${debt.fromUserId}-${debt.toUserId}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-red-100 text-red-700">
                          {getUserName(debt.toUserId)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-700">{getUserName(debt.toUserId)}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(debt.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {owedToMe.length > 0 && (
            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Owed to you
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {owedToMe.map((debt) => (
                  <div key={`${debt.fromUserId}-${debt.toUserId}`} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-green-100 text-green-700">
                          {getUserName(debt.fromUserId)[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-slate-700">{getUserName(debt.fromUserId)}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(debt.amount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Tabs: Expenses | Members */}
      <Tabs defaultValue="expenses">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="expenses" className="gap-2">
            <Receipt className="w-4 h-4" />
            Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Members ({group.members.length})
          </TabsTrigger>
          <TabsTrigger value="balances">
            All Balances
          </TabsTrigger>
        </TabsList>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="mt-4 space-y-3">
          {expenses.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-200 bg-transparent shadow-none">
              <CardContent className="p-12 text-center">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium mb-1">No expenses yet</p>
                <p className="text-slate-400 text-sm mb-4">Be the first to add an expense</p>
                <Link href={`/groups/${group.id}/expenses/new`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 gap-2">
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
                  <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                            <Receipt className="w-5 h-5 text-slate-500" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {expense.title}
                            </div>
                            <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {format(new Date(expense.date), 'MMM d, yyyy')}
                              {' · '}
                              paid by {iAmPayer ? 'you' : expense.payer.name.split(' ')[0]}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-semibold text-slate-900">
                              {formatCurrency(expense.total_amount)}
                            </div>
                            <div className="flex gap-1 mt-0.5 justify-end">
                              {pendingCount > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  {pendingCount} pending
                                </Badge>
                              )}
                              {paidCount > 0 && (
                                <Badge variant="secondary" className="text-xs bg-yellow-50 text-yellow-700">
                                  {paidCount} awaiting approval
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                      </div>

                      {mySplit && !iAmPayer && (
                        <div className={cn(
                          'mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-sm',
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
        <TabsContent value="members" className="mt-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="divide-y divide-slate-100 p-0">
              {group.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={member.user.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                        {member.user.name[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-slate-900 flex items-center gap-2">
                        {member.user.name}
                        {member.user_id === currentUserId && (
                          <span className="text-xs text-slate-400">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{member.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.role === 'admin' && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Crown className="w-3 h-3" />
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {isAdmin && (
            <div className="mt-4">
              <InviteMemberModal groupId={group.id} />
            </div>
          )}
        </TabsContent>

        {/* All Balances Tab */}
        <TabsContent value="balances" className="mt-4">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader>
              <CardTitle className="text-base">Balance Summary</CardTitle>
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
