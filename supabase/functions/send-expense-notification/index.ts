import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { expenseId } = await req.json();
    if (!expenseId) {
      return new Response(JSON.stringify({ error: "expenseId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch expense with splits, payer, and group info
    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .select(`
        *,
        payer:users!expenses_paid_by_fkey(id, name, email),
        group:groups(id, name),
        splits:expense_splits(
          *,
          user:users(id, name, email)
        )
      `)
      .eq("id", expenseId)
      .single();

    if (expenseError || !expense) {
      return new Response(JSON.stringify({ error: "Expense not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, skipping email notifications");
      return new Response(
        JSON.stringify({ message: "Email notifications skipped (no API key)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    });

    // Send email to each participant (except payer)
    const emailPromises = expense.splits
      .filter((split: any) => split.user_id !== expense.paid_by && split.amount_owed > 0)
      .map(async (split: any) => {
        const html = `
          <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <div style="background: #2563eb; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 20px;">New Expense Added</h1>
              <p style="margin: 4px 0 0; opacity: 0.85; font-size: 14px;">Hisaab</p>
            </div>
            <div style="background: white; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <p style="color: #475569; margin-top: 0;">Hi ${split.user.name},</p>
              <p style="color: #1e293b;">
                <strong>${expense.payer.name}</strong> added a new expense in
                <strong>${expense.group.name}</strong>:
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <div style="font-size: 18px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">
                  ${expense.title}
                </div>
                <div style="color: #64748b; font-size: 14px;">
                  Total: ${formatter.format(expense.total_amount)}
                </div>
              </div>
              <div style="background: #fef3c7; border-radius: 8px; padding: 16px; text-align: center;">
                <div style="color: #92400e; font-size: 14px; margin-bottom: 4px;">Your Share</div>
                <div style="color: #b45309; font-size: 28px; font-weight: bold;">
                  ${formatter.format(split.amount_owed)}
                </div>
              </div>
              <p style="color: #64748b; font-size: 14px; margin-top: 16px;">
                Log in to Hisaab to mark this as paid once you've sent the money to ${expense.payer.name}.
              </p>
            </div>
          </div>
        `;

        return fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Hisaab <noreply@yourdomain.com>",
            to: [split.user.email],
            subject: `New expense: ${expense.title} — You owe ${formatter.format(split.amount_owed)}`,
            html,
          }),
        });
      });

    await Promise.allSettled(emailPromises);

    return new Response(
      JSON.stringify({ success: true, notified: expense.splits.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
