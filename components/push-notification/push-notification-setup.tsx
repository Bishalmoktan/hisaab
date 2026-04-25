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

type PermissionState = "idle" | "loading" | "denied" | "error";

function isIOS() {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true // iOS Safari
  );
}

export function PushNotificationSetup() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<PermissionState>("idle");

  useEffect(() => {
    // Don't show if notifications not supported
    if (!("Notification" in window)) return;

    console.log("Notification permission:", Notification.permission);

    // Don't show if already granted or denied
    if (Notification.permission !== "default") return;

    const ios = isIOS();

    if (ios) {
      // iOS: only works in standalone (PWA) mode
      if (isStandalone()) {
        setOpen(true);
      }
    } else {
      // Android & Desktop: always prompt if not yet decided
      setOpen(true);
    }
  }, []);

  const enableNotifications = async () => {
    setState("loading");

    try {
      await registerServiceWorker();

      const permission = await Notification.requestPermission();

      if (permission === "denied") {
        setState("denied");
        return;
      }

      if (permission !== "granted") {
        setState("idle");
        return;
      }

      const subscription = await subscribeToPush();
      if (subscription) {
        await saveSubscription(subscription.toJSON());
      }

      setOpen(false);
    } catch (err) {
      console.error("Push setup failed:", err);
      setState("error");
    } finally {
      setState("idle");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enable Notifications</DialogTitle>
          <DialogDescription>
            {isIOS()
              ? "Get notified when someone approves or updates your payments. Works best on iPhone Home Screen (PWA)."
              : "Get notified when someone approves or updates your payments."}
          </DialogDescription>
        </DialogHeader>

        {state === "denied" && (
          <p className="text-sm text-red-500">
            Notifications were blocked. Please enable them in your browser
            settings and reload the page.
          </p>
        )}

        {state === "error" && (
          <p className="text-sm text-red-500">
            Something went wrong. Please try again.
          </p>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={state === "loading"}
          >
            Not Now
          </Button>
          <Button
            onClick={enableNotifications}
            disabled={state === "loading"}
          >
            {state === "loading" ? "Enabling..." : "Enable Notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}