"use server";

import webpush from "web-push";
import { createClient } from "@/lib/supabase/server";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendNotificationToUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
) {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("push_subscriptions")
    .select("id, subscription")
    .eq("user_id", userId);

  if (!rows?.length) return;

  await Promise.allSettled(
    rows.map(async ({ id, subscription }) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", id);
        }
      }
    }),
  );
}
