import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getMonthlyExpensesByDay,
  getMonthlyExpensesData,
  getUserExpenseMonths,
} from "@/lib/services/expenses";
import { MonthlyExpensesClient } from "@/components/expenses/monthly-expenses-client";

export const metadata = {
  title: "Monthly Expenses | Hisaab",
  description: "View your monthly expense analytics and trends",
};

export default async function MonthlyExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Fetch data in parallel
  const [monthlyData, rawData, availableMonths] = await Promise.all([
    getMonthlyExpensesByDay(currentYear, currentMonth),
    getMonthlyExpensesData(currentYear, currentMonth),
    getUserExpenseMonths(currentYear),
  ]);

  const expenses = rawData?.expenses ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <MonthlyExpensesClient
          monthlyData={monthlyData}
          rawExpenses={expenses}
          month={currentMonth}
          year={currentYear}
          availableMonths={availableMonths}
        />
      </div>
    </div>
  );
}
