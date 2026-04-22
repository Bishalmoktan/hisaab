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
    const result = await acceptInvite(params.token);

    if (!result.success) {
      const message = result.message || "Failed to accept invite";

      if (message === "NOT_AUTHENTICATED") {
        router.push(`/login?redirect=/invite/${params.token}`);
        return;
      }

      toast.error(message);
      setLoading(false);
      return;
    }

    setAccepted(true);
    toast.success("Invite accepted! Welcome to the group.");
    if (result.groupId) {
      setTimeout(() => router.push(`/groups/${result.groupId}`), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center pb-3 sm:pb-4">
          <div className="w-12 sm:w-16 h-12 sm:h-16 bg-blue-100 rounded-lg sm:rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-4">
            {accepted ? (
              <CheckCircle className="w-6 sm:w-8 h-6 sm:h-8 text-green-600" />
            ) : (
              <Users className="w-6 sm:w-8 h-6 sm:h-8 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {accepted ? "Welcome aboard!" : "You've been invited"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {accepted
              ? "Redirecting you to the group..."
              : "You have been invited to join an expense sharing group."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          {!accepted && (
            <>
              <p className="text-xs sm:text-sm text-slate-500 text-center">
                Sign in with your account and click accept to join the group and
                start splitting expenses with your team.
              </p>
              <Button
                onClick={handleAccept}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-sm sm:text-base h-9 sm:h-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    <span className="hidden sm:inline">Accepting...</span>
                    <span className="sm:hidden">Accepting</span>
                  </>
                ) : (
                  <span>Accept Invitation</span>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => router.push("/dashboard")}
                className="w-full text-sm sm:text-base"
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
