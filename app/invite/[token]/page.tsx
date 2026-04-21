"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/services/groups";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader as Loader2,
  Users,
  CircleCheck as CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function InvitePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const groupId = await acceptInvite(params.token);
      setAccepted(true);
      toast.success("Invite accepted! Welcome to the group.");
      setTimeout(() => router.push(`/groups/${groupId}`), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to accept invite";

      if (message === "NOT_AUTHENTICATED") {
        router.push(`/login?redirect=/invite/${params.token}`);
        return;
      }

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            {accepted ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <Users className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {accepted ? "Welcome aboard!" : "You've been invited"}
          </CardTitle>
          <CardDescription>
            {accepted
              ? "Redirecting you to the group..."
              : "You have been invited to join an expense sharing group."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!accepted && (
            <>
              <p className="text-sm text-slate-500 text-center">
                Sign in with your account and click accept to join the group and
                start splitting expenses with your team.
              </p>
              <Button
                onClick={handleAccept}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
