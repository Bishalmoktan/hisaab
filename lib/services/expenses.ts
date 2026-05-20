"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExpenseWithDetails, SplitInput } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { sendNotificationToUser } from "../actions/notify";

export async function getGroupExpenses(
  groupId: string,
): Promise<ExpenseWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      *,
      payer:users!expenses_paid_by_fkey(*),
      splits:expense_splits(
        *,
        user:users(*)
      )
    `,
    )
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getGroupExpenses error:", error);
    return [];
  }

  return (data as ExpenseWithDetails[]) ?? [];
}

export async function getExpenseById(
  expenseId: string,
): Promise<ExpenseWithDetails | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      *,
      payer:users!expenses_paid_by_fkey(*),
      splits:expense_splits(
        *,
        user:users(*)
      )
    `,
    )
    .eq("id", expenseId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ExpenseWithDetails;
}

export async function getRecentExpenses(
  limit = 10,
): Promise<ExpenseWithDetails[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user's group IDs
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  if (!memberships?.length) return [];
  const groupIds = (memberships as { group_id: string }[]).map(
    (m) => m.group_id,
  );

  const { data, error } = await supabase
    .from("expenses")
    .select(
      `
      *,
      payer:users!expenses_paid_by_fkey(*),
      splits:expense_splits(
        *,
        user:users(*)
      )
    `,
    )
    .in("group_id", groupIds)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data as ExpenseWithDetails[]) ?? [];
}

export async function createExpense(
  groupId: string,
  title: string,
  totalAmount: number,
  date: string,
  notes: string,
  splits: SplitInput[],
): Promise<{ success: boolean; message?: string; expense?: any }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  // Validate splits sum
  const splitsTotal = splits.reduce((sum, s) => sum + Number(s.amountOwed), 0);
  const diff = Math.abs(splitsTotal - totalAmount);
  if (diff > 0.01) {
    return {
      success: false,
      message: `Split amounts (${splitsTotal.toFixed(2)}) must equal total amount (${totalAmount.toFixed(2)})`,
    };
  }

  if (splits.length === 0) {
    return { success: false, message: "At least one participant is required" };
  }
  if (splits.some((s) => s.amountOwed < 0)) {
    return { success: false, message: "Amounts must be >= 0" };
  }

  const { data: expense, error: expenseError } = await supabase
    .from("expenses")
    .insert({
      group_id: groupId,
      paid_by: user.id,
      title: title.trim(),
      total_amount: totalAmount,
      date,
      description: notes.trim(),
    })
    .select()
    .single();

  if (expenseError || !expense) {
    return {
      success: false,
      message: expenseError?.message ?? "Failed to create expense",
    };
  }

  const { error: splitsError } = await supabase.from("expense_splits").insert(
    splits.map((s) => ({
      expense_id: expense.id,
      user_id: s.userId,
      amount_owed: s.amountOwed,
      status:
        s.userId === user.id ? ("approved" as const) : ("pending" as const),
    })),
  );

  if (splitsError) {
    await supabase.from("expenses").delete().eq("id", expense.id);
    return { success: false, message: splitsError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");

  supabase.functions
    .invoke("send-email", {
      body: {
        expenseId: expense.id,
      },
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    })
    .then(() => console.log("Email function triggered"))
    .catch((error) => console.error("Error invoking send-email:", error));

  return { success: true, expense };
}

export async function markSplitAsPaid(
  splitId: string,
  expenseId: string,
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { error } = await supabase
    .from("expense_splits")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", splitId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) {
    return { success: false, message: error.message };
  }

  const { data: expense } = await supabase
    .from("expenses")
    .select("group_id")
    .eq("id", expenseId)
    .single();

  if (expense) {
    revalidatePath(`/groups/${expense.group_id}`);
    revalidatePath(`/expenses/${expenseId}`);
    revalidatePath("/dashboard");

    const { data: expenseDetails } = await supabase
      .from("expenses")
      .select("title, paid_by, payer:users!expenses_paid_by_fkey(name)")
      .eq("id", expenseId)
      .single();

    if (expenseDetails) {
      try {
        await sendNotificationToUser(expenseDetails.paid_by, {
          title: "Payment Update",
          body: `${
            user.user_metadata?.name || "Someone"
          } marked their share as paid for "${expenseDetails.title}"`,
          url: `/expenses/${expenseId}`,
        });
      } catch (err) {
        console.error("Push notification failed:", err);
      }
    }
  }

  return { success: true };
}

export async function approveSplit(
  splitId: string,
  expenseId: string,
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  // Verify current user is the payer
  const { data: expense } = await supabase
    .from("expenses")
    .select("group_id, paid_by, title")
    .eq("id", expenseId)
    .eq("paid_by", user.id)
    .maybeSingle();

  if (!expense) {
    return {
      success: false,
      message: "Not authorized to approve this payment",
    };
  }

  const { data: updatedSplit, error } = await supabase
    .from("expense_splits")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", splitId)
    .eq("status", "paid")
    .select("user_id, amount_owed")
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }

  if (updatedSplit) {
    try {
      await sendNotificationToUser(updatedSplit.user_id, {
        title: "Payment Approved",
        body: `Your payment of Rs.${updatedSplit.amount_owed} for "${expense.title}" has been approved ✅`,
        url: `/expenses/${expenseId}`,
      });
    } catch (err) {
      console.error("Push failed:", err);
    }
  }

  revalidatePath(`/groups/${expense.group_id}`);
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function rejectSplit(
  splitId: string,
  expenseId: string,
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: expense } = await supabase
    .from("expenses")
    .select("group_id, paid_by, title")
    .eq("id", expenseId)
    .eq("paid_by", user.id)
    .maybeSingle();

  if (!expense) {
    return { success: false, message: "Not authorized" };
  }

  const { data: rejectedSplit, error } = await supabase
    .from("expense_splits")
    .update({ status: "pending", paid_at: null })
    .eq("id", splitId)
    .eq("status", "paid")
    .select("user_id, amount_owed")
    .maybeSingle();

  if (error) {
    return { success: false, message: error.message };
  }

  if (rejectedSplit) {
    try {
      await sendNotificationToUser(rejectedSplit.user_id, {
        title: "Payment Rejected",
        body: `Your payment of Rs.${rejectedSplit.amount_owed} for "${expense.title}" has been rejected ❌`,
        url: `/expenses/${expenseId}`,
      });
    } catch (err) {
      console.error("Push failed:", err);
    }
  }

  revalidatePath(`/groups/${expense.group_id}`);
  revalidatePath(`/expenses/${expenseId}`);
  return { success: true };
}

export async function deleteExpense(
  expenseId: string,
  groupId: string,
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);
  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function markDebtAsPaidForUser(
  groupId: string,
  toUserId: string,
): Promise<{ success: boolean; message?: string; count?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  // Get all expenses paid by the toUserId in the group
  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("id")
    .eq("group_id", groupId)
    .eq("paid_by", toUserId);

  if (expensesError || !expenses) {
    return { success: false, message: "Failed to fetch expenses" };
  }

  const expenseIds = expenses.map((e) => e.id);

  if (expenseIds.length === 0) {
    return { success: true, count: 0 };
  }

  // Get all pending splits for the current user in these expenses
  const { data: splits, error: splitsError } = await supabase
    .from("expense_splits")
    .select("id, expense_id")
    .in("expense_id", expenseIds)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (splitsError || !splits) {
    return { success: false, message: "Failed to fetch splits" };
  }

  if (splits.length === 0) {
    return { success: true, count: 0 };
  }

  // Mark all as paid
  const { error: updateError } = await supabase
    .from("expense_splits")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .in(
      "id",
      splits.map((s) => s.id),
    )
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");

  return { success: true, count: splits.length };
}

export async function approveDebtPaymentsFromUser(
  groupId: string,
  fromUserId: string,
): Promise<{ success: boolean; message?: string; count?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  // Get all expenses owned by current user in the group
  const { data: expenses, error: expensesError } = await supabase
    .from("expenses")
    .select("id")
    .eq("group_id", groupId)
    .eq("paid_by", user.id);

  if (expensesError || !expenses) {
    return { success: false, message: "Failed to fetch expenses" };
  }

  const expenseIds = expenses.map((e) => e.id);

  if (expenseIds.length === 0) {
    return { success: true, count: 0 };
  }

  // Get all paid splits from the specific user for these expenses
  const { data: splits, error: splitsError } = await supabase
    .from("expense_splits")
    .select("id, user_id, amount_owed, expense_id")
    .in("expense_id", expenseIds)
    .eq("user_id", fromUserId)
    .eq("status", "paid");

  if (splitsError || !splits) {
    return { success: false, message: "Failed to fetch splits" };
  }

  if (splits.length === 0) {
    return { success: true, count: 0 };
  }

  // Mark all as approved
  const { error: updateError } = await supabase
    .from("expense_splits")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .in(
      "id",
      splits.map((s) => s.id),
    )
    .eq("user_id", fromUserId)
    .eq("status", "paid");

  if (updateError) {
    return { success: false, message: updateError.message };
  }

  // Send notification to user whose payments were approved
  for (const split of splits) {
    try {
      const { data: expense } = await supabase
        .from("expenses")
        .select("title")
        .eq("id", split.expense_id)
        .single();

      if (expense) {
        await sendNotificationToUser(split.user_id, {
          title: "Payment Approved",
          body: `Your payment of Rs.${split.amount_owed} for "${expense.title}" has been approved ✅`,
          url: `/expenses/${split.expense_id}`,
        });
      }
    } catch (err) {
      console.error("Push notification failed for split:", err);
    }
  }

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");

  return { success: true, count: splits.length };
}

// Get monthly expenses for dashboard charts
export async function getMonthlyExpensesData(year: number, month: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's group IDs
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  if (!memberships?.length) return null;
  const groupIds = (memberships as { group_id: string }[]).map(
    (m) => m.group_id,
  );

  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select(
      `
      id,
      date,
      title,
      total_amount,
      paid_by,
      splits:expense_splits(
        user_id,
        amount_owed
      )
    `,
    )
    .in("group_id", groupIds)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("getMonthlyExpensesData error:", error);
    return null;
  }

  return {
    expenses: expenses ?? [],
    month,
    year,
  };
}

// Get daily expense breakdown for a month
export async function getMonthlyExpensesByDay(year: number, month: number) {
  const data = await getMonthlyExpensesData(year, month);
  if (!data) return [];

  const dayMap = new Map<
    string,
    { date: string; totalAmount: number; count: number }
  >();

  data.expenses.forEach((expense) => {
    const date = expense.date;
    const existing = dayMap.get(date) ?? {
      date,
      totalAmount: 0,
      count: 0,
    };
    dayMap.set(date, {
      date,
      totalAmount: existing.totalAmount + Number(expense.total_amount),
      count: existing.count + 1,
    });
  });

  return Array.from(dayMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

// Get all months with expenses for a year
export async function getUserExpenseMonths(year?: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user's group IDs
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  if (!memberships?.length) return [];
  const groupIds = (memberships as { group_id: string }[]).map(
    (m) => m.group_id,
  );

  const targetYear = year ?? new Date().getFullYear();
  const startDate = `${targetYear}-01-01`;
  const endDate = `${targetYear}-12-31`;

  const { data: expenses } = await supabase
    .from("expenses")
    .select("date")
    .in("group_id", groupIds)
    .gte("date", startDate)
    .lte("date", endDate);

  if (!expenses) return [];

  const months = new Set<number>();
  expenses.forEach((expense) => {
    const month = new Date(expense.date).getMonth() + 1;
    months.add(month);
  });

  return Array.from(months).sort((a, b) => a - b);
}

// Get group members expense summary for leaderboard
export async function getGroupMembersExpenseSummary(
  groupId: string,
  year: number,
  month: number,
) {
  const supabase = await createClient();

  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month, 0).toISOString().split("T")[0];

  // Get group members
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, user:users(*)")
    .eq("group_id", groupId);

  if (!members?.length) return [];

  // Get all expenses for the month in this group
  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      `
      id,
      paid_by,
      total_amount,
      splits:expense_splits(
        user_id,
        amount_owed
      )
    `,
    )
    .eq("group_id", groupId)
    .gte("date", startDate)
    .lte("date", endDate);

  // Calculate expenses for each member
  const memberExpenses = new Map<string, { total: number; paid: number }>();

  members.forEach((member) => {
    memberExpenses.set(member.user_id, { total: 0, paid: 0 });
  });

  expenses?.forEach((expense) => {
    // Add amount paid
    const existing = memberExpenses.get(expense.paid_by) ?? {
      total: 0,
      paid: 0,
    };
    existing.paid += Number(expense.total_amount);
    memberExpenses.set(expense.paid_by, existing);

    // Add amount owed
    expense.splits.forEach((split) => {
      const existing2 = memberExpenses.get(split.user_id) ?? {
        total: 0,
        paid: 0,
      };
      existing2.total += Number(split.amount_owed);
      memberExpenses.set(split.user_id, existing2);
    });
  });

  // Convert to leaderboard format
  const leaderboard = (members as any[])
    .map((member) => {
      const exp = memberExpenses.get(member.user_id) ?? { total: 0, paid: 0 };
      return {
        userId: member.user_id,
        user: member.user,
        totalExpense: exp.total,
        amountPaid: exp.paid,
        balance: exp.paid - exp.total,
      };
    })
    .sort((a, b) => a.totalExpense - b.totalExpense);

  return leaderboard;
}

// Get daily leaderboard for a specific day
export async function getGroupMembersExpenseSummaryByDay(
  groupId: string,
  date: string,
) {
  const supabase = await createClient();

  // Get group members
  const { data: members } = await supabase
    .from("group_members")
    .select("user_id, user:users(*)")
    .eq("group_id", groupId);

  if (!members?.length) return [];

  // Get all expenses for the day in this group
  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      `
      id,
      paid_by,
      total_amount,
      splits:expense_splits(
        user_id,
        amount_owed
      )
    `,
    )
    .eq("group_id", groupId)
    .eq("date", date);

  // Calculate expenses for each member
  const memberExpenses = new Map<string, { total: number; paid: number }>();

  members.forEach((member) => {
    memberExpenses.set(member.user_id, { total: 0, paid: 0 });
  });

  expenses?.forEach((expense) => {
    // Add amount paid
    const existing = memberExpenses.get(expense.paid_by) ?? {
      total: 0,
      paid: 0,
    };
    existing.paid += Number(expense.total_amount);
    memberExpenses.set(expense.paid_by, existing);

    // Add amount owed
    expense.splits.forEach((split) => {
      const existing2 = memberExpenses.get(split.user_id) ?? {
        total: 0,
        paid: 0,
      };
      existing2.total += Number(split.amount_owed);
      memberExpenses.set(split.user_id, existing2);
    });
  });

  // Convert to leaderboard format
  const leaderboard = (members as any[])
    .map((member) => {
      const exp = memberExpenses.get(member.user_id) ?? { total: 0, paid: 0 };
      return {
        userId: member.user_id,
        user: member.user,
        totalExpense: exp.total,
        amountPaid: exp.paid,
        balance: exp.paid - exp.total,
      };
    })
    .sort((a, b) => a.totalExpense - b.totalExpense);

  return leaderboard;
}
