"use client";

import Link from "next/link";
import { format } from "date-fns";
import type {
  GroupWithMembers,
  ExpenseWithDetails,
  UserNetBalance,
  User,
} from "@/lib/types";
import { formatCurrency } from "@/lib/services/balances";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreateGroupModal } from "@/components/groups/create-group-modal";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Plus,
  ArrowRight,
  Receipt,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  user: User;
  groups: GroupWithMembers[];
  recentExpenses: ExpenseWithDetails[];
  myBalance: UserNetBalance | null;
}

export function DashboardClient({
  user,
  groups,
  recentExpenses,
  myBalance,
}: Props) {
  const totalOwed = myBalance?.totalOwed ?? 0;
  const totalToReceive = myBalance?.totalToReceive ?? 0;
  const netBalance = myBalance?.netBalance ?? 0;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-500 mt-0.5">
            Here&apos;s an overview of your shared expenses
          </p>
        </div>
        <div className="shrink-0">
          <CreateGroupModal />
        </div>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                You Owe
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
              </div>
            </div>
            <div className="text-base sm:text-lg lg:text-2xl font-bold text-red-600">
              {formatCurrency(totalOwed)}
            </div>
            <div className="text-xs text-slate-400 mt-1">pending payments</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                You&apos;re Owed
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
              </div>
            </div>
            <div className="text-base sm:text-lg lg:text-2xl font-bold text-green-600">
              {formatCurrency(totalToReceive)}
            </div>
            <div className="text-xs text-slate-400 mt-1">to collect</div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "border-0 shadow-sm",
            netBalance > 0
              ? "bg-green-50"
              : netBalance < 0
                ? "bg-red-50"
                : "bg-slate-50",
          )}
        >
          <CardContent className="p-3 sm:p-4 lg:p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                Net Balance
              </span>
              <div
                className={cn(
                  "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center",
                  netBalance > 0
                    ? "bg-green-100"
                    : netBalance < 0
                      ? "bg-red-100"
                      : "bg-slate-100",
                )}
              >
                {netBalance > 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                ) : netBalance < 0 ? (
                  <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-600" />
                ) : (
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                )}
              </div>
            </div>
            <div
              className={cn(
                "text-base sm:text-lg lg:text-2xl font-bold",
                netBalance > 0
                  ? "text-green-700"
                  : netBalance < 0
                    ? "text-red-700"
                    : "text-slate-500",
              )}
            >
              {netBalance >= 0 ? "+" : ""}
              {formatCurrency(netBalance)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {netBalance > 0
                ? "overall to receive"
                : netBalance < 0
                  ? "overall to pay"
                  : "all settled up"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* Groups */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">
              Your Groups
            </h2>
            <Link
              href="/groups"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 whitespace-nowrap"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {groups.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-200 bg-transparent shadow-none">
              <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                <Users className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-slate-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-slate-500 font-medium text-xs sm:text-sm lg:text-base mb-1">No groups yet</p>
                <p className="text-slate-400 text-xs mb-4">
                  Create a group to start splitting expenses
                </p>
                <CreateGroupModal />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {groups.slice(0, 4).map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white">
                    <CardContent className="p-2 sm:p-3 lg:p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 sm:w-9 lg:w-10 h-8 sm:h-9 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center text-xs sm:text-sm lg:text-base font-bold text-blue-700 shrink-0">
                            {group.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm lg:text-base text-slate-900 truncate">
                              {group.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {group.members.length} member
                              {group.members.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-900">
              Recent Expenses
            </h2>
          </div>

          {recentExpenses.length === 0 ? (
            <Card className="border-2 border-dashed border-slate-200 bg-transparent shadow-none">
              <CardContent className="p-4 sm:p-6 lg:p-8 text-center">
                <Receipt className="w-6 sm:w-8 lg:w-10 h-6 sm:h-8 lg:h-10 text-slate-300 mx-auto mb-2 sm:mb-3" />
                <p className="text-slate-500 font-medium text-xs sm:text-sm lg:text-base">No expenses yet</p>
                <p className="text-slate-400 text-xs mt-1">
                  Add an expense in any of your groups
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {recentExpenses.slice(0, 5).map((expense) => {
                const mySplit = expense.splits.find(
                  (s) => s.user_id === user.id,
                );
                const iAmPayer = expense.paid_by === user.id;

                return (
                  <Link key={expense.id} href={`/expenses/${expense.id}`}>
                    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white">
                      <CardContent className="p-2 sm:p-3 lg:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 sm:w-8 lg:w-9 h-7 sm:h-8 lg:h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                              <Receipt className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-xs sm:text-sm lg:text-base text-slate-900 truncate">
                                {expense.title}
                              </div>
                              <div className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span className="truncate">{format(new Date(expense.date), "MMM d")}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-semibold text-slate-900 text-xs">
                              {formatCurrency(expense.total_amount)}
                            </div>
                            {mySplit && !iAmPayer && (
                              <Badge
                                variant={
                                  mySplit.status === "approved"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="text-xs mt-0.5 whitespace-nowrap"
                              >
                                {mySplit.status === "approved"
                                  ? "settled"
                                  : `you owe ${formatCurrency(Number(mySplit.amount_owed))}`}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
