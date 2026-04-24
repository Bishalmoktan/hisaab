"use client";

import { useEffect } from "react";
import { registerServiceWorker, subscribeToPush } from "@/lib/push";
import { saveSubscription } from "@/lib/actions/push";

export function PushNotificationSetup() {
  useEffect(() => {
    async function init() {
      await registerServiceWorker();

      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const subscription = await subscribeToPush();
      if (subscription) {
        await saveSubscription(subscription.toJSON());
      }
    }

    init();
  }, []);

  return null;
}
