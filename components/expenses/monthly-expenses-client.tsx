"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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
import { formatCurrency } from "@/lib/services/balances";
import { TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";

interface MonthlyExpensesClientProps {
  monthlyData: Array<{
    date: string;
    totalAmount: number;
    count: number;
  }>;
  rawExpenses: Array<{
    id: string;
    date: string;
    title: string;
    total_amount: number;
    paid_by: string;
    splits: Array<{
      user_id: string;
      amount_owed: number;
    }>;
  }>;
  month: number;
  year: number;
  availableMonths: number[];
}

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#14b8a6",
];

export function MonthlyExpensesClient({
  monthlyData,
  rawExpenses,
  month,
  year,
  availableMonths,
}: MonthlyExpensesClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [viewType, setViewType] = useState<"daily" | "category">("daily");

  // Calculate category breakdown
  const categoryData = useMemo(() => {
    const categories = new Map<string, number>();
    rawExpenses.forEach((exp) => {
      const existing = categories.get(exp.title) ?? 0;
      categories.set(exp.title, existing + Number(exp.total_amount));
    });
    return Array.from(categories.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [rawExpenses]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalExpense = rawExpenses.reduce(
      (sum, exp) => sum + Number(exp.total_amount),
      0
    );
    const avgDaily = monthlyData.length > 0 ? totalExpense / monthlyData.length : 0;
    const maxDay = monthlyData.reduce(
      (max, day) => (day.totalAmount > max.totalAmount ? day : max),
      monthlyData[0] ?? { totalAmount: 0, date: "", count: 0 }
    );

    return {
      totalExpense,
      avgDaily,
      maxDay: maxDay.totalAmount,
      transactionCount: rawExpenses.length,
    };
  }, [rawExpenses, monthlyData]);

  return (
    <div className="space-y-6 w-full">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Monthly Expenses</h2>
          <p className="text-sm text-slate-600">Track your spending patterns</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {format(new Date(year, m - 1), "MMMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={viewType} onValueChange={(v) => setViewType(v as "daily" | "category")}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="View type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="category">By Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Total Expenses</span>
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.totalExpense)}
            </div>
            <div className="text-xs text-slate-400 mt-1">{stats.transactionCount} transactions</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Average Daily</span>
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.avgDaily)}
            </div>
            <div className="text-xs text-slate-400 mt-1">per day</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Highest Day</span>
              <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.maxDay)}
            </div>
            <div className="text-xs text-slate-400 mt-1">peak spending day</div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">Active Days</span>
              <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{monthlyData.length}</div>
            <div className="text-xs text-slate-400 mt-1">days with expenses</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bar Chart */}
        {viewType === "daily" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Daily Spending</CardTitle>
              <CardDescription>Daily expense breakdown for the month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: "#94a3b8" }}
                    tickFormatter={(date) => format(parseISO(date), "MMM d")}
                  />
                  <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #334155",
                      borderRadius: "0.5rem",
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
                    labelFormatter={(date) => format(parseISO(date), "PPP")}
                  />
                  <Bar
                    dataKey="totalAmount"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Category Pie Chart */}
        {viewType === "category" && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Spending by Category</CardTitle>
              <CardDescription>Top expense categories this month</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, value }) =>
                      `${name}: ${formatCurrency(value)}`
                    }
                  >
                    {categoryData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Line Chart - Cumulative */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Cumulative Spending</CardTitle>
            <CardDescription>Running total throughout the month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={monthlyData.map((day, idx, arr) => ({
                  ...day,
                  cumulative: arr
                    .slice(0, idx + 1)
                    .reduce((sum, d) => sum + d.totalAmount, 0),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                  tickFormatter={(date) => format(parseISO(date), "MMM d")}
                />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #334155",
                    borderRadius: "0.5rem",
                  }}
                  formatter={(value) => [formatCurrency(Number(value)), "Total"]}
                  labelFormatter={(date) => format(parseISO(date), "PPP")}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Cumulative Total"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Category List */}
      {categoryData.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryData.map((category, idx) => {
                const percentage = (
                  (category.value / stats.totalExpense) *
                  100
                ).toFixed(1);
                return (
                  <div key={category.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {category.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        {percentage}%
                      </Badge>
                      <span className="text-sm font-semibold text-slate-900 min-w-[80px] text-right">
                        {formatCurrency(category.value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
