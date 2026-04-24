"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveSubscription(subscription: PushSubscriptionJSON) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  // Check if this endpoint already exists for this user
  const { data: existing } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .filter("subscription->>endpoint", "eq", subscription.endpoint)
    .maybeSingle();

  if (existing) {
    return;
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .insert({ user_id: user.id, subscription });

  if (error) {
    throw new Error(error.message);
  }
}