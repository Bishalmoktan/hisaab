"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { registerServiceWorker, subscribeToPush } from "@/lib/push";
import { saveSubscription } from "@/lib/actions/push";

function isIOS() {
  if (typeof window === "undefined") return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

export function PushNotificationSetup() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const alreadyGranted = Notification.permission === "granted";

    const ios = isIOS();

    // show ONLY for iOS users who haven't granted permission
    if (ios && !alreadyGranted) {
      setOpen(true);
    }
  }, []);

  const enableNotifications = async () => {
    setLoading(true);

    try {
      await registerServiceWorker();
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;

      const subscription = await subscribeToPush();
      if (subscription) {

        await saveSubscription(subscription.toJSON());
      }

      setOpen(false);
    } catch (err) {
      console.error("Push setup failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable Notifications</DialogTitle>
          <DialogDescription>
            Get notified when someone approves or updates your payments.
            Works best on iPhone Home Screen (PWA).
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
                enableNotifications();
            }}
            disabled={loading}
          >
            {loading ? "Enabling..." : "Enable Notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}