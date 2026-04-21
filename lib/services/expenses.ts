"use server";

import { createClient } from "@/lib/supabase/server";
import type { ExpenseWithDetails, SplitInput } from "@/lib/types";
import { revalidatePath } from "next/cache";

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
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Validate splits sum
  const splitsTotal = splits.reduce((sum, s) => sum + Number(s.amountOwed), 0);
  const diff = Math.abs(splitsTotal - totalAmount);
  if (diff > 0.01) {
    throw new Error(
      `Split amounts (${splitsTotal.toFixed(2)}) must equal total amount (${totalAmount.toFixed(2)})`,
    );
  }

  if (splits.length === 0)
    throw new Error("At least one participant is required");
  if (splits.some((s) => s.amountOwed < 0))
    throw new Error("Amounts must be >= 0");

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

  if (expenseError || !expense)
    throw new Error(expenseError?.message ?? "Failed to create expense");

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
    throw new Error(splitsError.message);
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

  return expense;
}

export async function markSplitAsPaid(splitId: string, expenseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("expense_splits")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", splitId)
    .eq("user_id", user.id)
    .eq("status", "pending");

  if (error) throw new Error(error.message);

  const { data: expense } = await supabase
    .from("expenses")
    .select("group_id")
    .eq("id", expenseId)
    .single();

  if (expense) {
    revalidatePath(`/groups/${expense.group_id}`);
    revalidatePath(`/expenses/${expenseId}`);
    revalidatePath("/dashboard");
  }
}

export async function approveSplit(splitId: string, expenseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify current user is the payer
  const { data: expense } = await supabase
    .from("expenses")
    .select("group_id, paid_by")
    .eq("id", expenseId)
    .eq("paid_by", user.id)
    .maybeSingle();

  if (!expense) throw new Error("Not authorized to approve this payment");

  const { error } = await supabase
    .from("expense_splits")
    .update({ status: "approved", approved_at: new Date().toISOString() })
    .eq("id", splitId)
    .eq("status", "paid");

  if (error) throw new Error(error.message);

  revalidatePath(`/groups/${expense.group_id}`);
  revalidatePath(`/expenses/${expenseId}`);
  revalidatePath("/dashboard");
}

export async function rejectSplit(splitId: string, expenseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: expense } = await supabase
    .from("expenses")
    .select("group_id, paid_by")
    .eq("id", expenseId)
    .eq("paid_by", user.id)
    .maybeSingle();

  if (!expense) throw new Error("Not authorized");

  const { error } = await supabase
    .from("expense_splits")
    .update({ status: "pending", paid_at: null })
    .eq("id", splitId)
    .eq("status", "paid");

  if (error) throw new Error(error.message);

  revalidatePath(`/groups/${expense.group_id}`);
  revalidatePath(`/expenses/${expenseId}`);
}

export async function deleteExpense(expenseId: string, groupId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId);
  if (error) throw new Error(error.message);

  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/dashboard");
}
