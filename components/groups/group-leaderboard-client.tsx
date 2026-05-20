"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatCurrency } from "@/lib/services/balances";
import {
  Trophy,
  TrendingDown,
  DollarSign,
  Users,
  Zap,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardUser {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  totalExpense: number;
  amountPaid: number;
  balance: number;
}

interface GroupLeaderboardClientProps {
  leaderboard: LeaderboardUser[];
  groupName: string;
  month: number;
  year: number;
}

export function GroupLeaderboardClient({
  leaderboard,
  groupName,
  month,
  year,
}: GroupLeaderboardClientProps) {
  const [sortBy, setSortBy] = useState<"least" | "most" | "balance">("least");

  const sortedData = useMemo(() => {
    const data = [...leaderboard];
    if (sortBy === "least") {
      return data.sort((a, b) => a.totalExpense - b.totalExpense);
    } else if (sortBy === "most") {
      return data.sort((a, b) => b.totalExpense - a.totalExpense);
    } else {
      return data.sort((a, b) => b.balance - a.balance);
    }
  }, [leaderboard, sortBy]);

  const chartData = sortedData.map((user, idx) => ({
    rank: idx + 1,
    name: user.user.name.split(" ")[0],
    expense: user.totalExpense,
    paid: user.amountPaid,
    balance: user.balance,
  }));

  const stats = useMemo(() => {
    const totalExpenses = leaderboard.reduce(
      (sum, u) => sum + u.totalExpense,
      0
    );
    const avgExpense = totalExpenses / Math.max(leaderboard.length, 1);
    const highestSpender = leaderboard.reduce((max, u) =>
      u.totalExpense > max.totalExpense ? u : max
    );
    const lowestSpender = leaderboard.reduce((min, u) =>
      u.totalExpense < min.totalExpense ? u : min
    );

    return {
      totalExpenses,
      avgExpense,
      highestSpender,
      lowestSpender,
    };
  }, [leaderboard]);

  const getMedalColor = (rank: number) => {
    if (rank === 1) return "text-yellow-500";
    if (rank === 2) return "text-gray-400";
    if (rank === 3) return "text-orange-600";
    return "text-slate-400";
  };

  const getMedalIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return rank.toString();
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Group Leaderboard</h2>
          <p className="text-sm text-slate-600">
            {groupName} • {format(new Date(year, month - 1), "MMMM yyyy")}
          </p>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as "least" | "most" | "balance")}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="least">Least Spent ⬆️</SelectItem>
            <SelectItem value="most">Most Spent ⬇️</SelectItem>
            <SelectItem value="balance">By Balance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                Total Group Expense
              </span>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.totalExpenses)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {leaderboard.length} members
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Average Spend</span>
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Target className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.avgExpense)}
            </div>
            <div className="text-xs text-slate-400 mt-1">per person</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                Most Spent
              </span>
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </div>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {stats.highestSpender.user.name}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatCurrency(stats.highestSpender.totalExpense)}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">
                Least Spent 🎯
              </span>
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate">
              {stats.lowestSpender.user.name}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatCurrency(stats.lowestSpender.totalExpense)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Expense Comparison</CardTitle>
          <CardDescription>How much each member spent this month</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
              />
              <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: "0.5rem",
                }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Legend />
              <Bar dataKey="expense" fill="#ef4444" name="Amount Spent" />
              <Bar dataKey="paid" fill="#10b981" name="Amount Paid" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Scatter Chart - Balance Analysis */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Balance Analysis</CardTitle>
          <CardDescription>
            Relationship between spending and balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="expense"
                name="Amount Spent"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <YAxis
                dataKey="balance"
                name="Balance"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #334155",
                  borderRadius: "0.5rem",
                }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Scatter
                name="Members"
                data={chartData}
                fill="#8b5cf6"
                line
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedData.map((user, idx) => {
              const rank = idx + 1;
              const diff = user.totalExpense - stats.avgExpense;
              const isAboveAvg = diff > 0;

              return (
                <div
                  key={user.userId}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg transition-colors",
                    rank === 1 && "bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200",
                    rank === 2 &&
                    "bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200",
                    rank === 3 &&
                    "bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200",
                    rank > 3 && "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "text-xl font-bold w-10 flex justify-center",
                      getMedalColor(rank)
                    )}>
                      {getMedalIcon(rank)}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user.user.avatar_url ?? undefined}
                        alt={user.user.name}
                      />
                      <AvatarFallback>
                        {user.user.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {user.user.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {user.user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(user.totalExpense)}
                      </p>
                      <Badge
                        variant={isAboveAvg ? "destructive" : "default"}
                        className="text-xs mt-1"
                      >
                        {isAboveAvg ? "+" : "-"}
                        {formatCurrency(Math.abs(diff))}
                      </Badge>
                    </div>
                    {user.balance > 0 && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Balance</p>
                        <p className="text-sm font-semibold text-green-600">
                          +{formatCurrency(user.balance)}
                        </p>
                      </div>
                    )}
                    {user.balance < 0 && (
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Owes</p>
                        <p className="text-sm font-semibold text-red-600">
                          {formatCurrency(Math.abs(user.balance))}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                {stats.lowestSpender.user.name} is the champion this month with
                only {formatCurrency(stats.lowestSpender.totalExpense)} spent!
                🎉
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                Average spending per person is{" "}
                {formatCurrency(stats.avgExpense)}.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                {
                  sortedData.filter((u) => u.totalExpense < stats.avgExpense)
                    .length
                }{" "}
                member
                {sortedData.filter((u) => u.totalExpense < stats.avgExpense)
                  .length !== 1
                  ? "s are"
                  : " is"}{" "}
                below average.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
