import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGroupMembersExpenseSummary } from "@/lib/services/expenses";
import { GroupLeaderboardClient } from "@/components/groups/group-leaderboard-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const metadata = {
  title: "Group Leaderboard | Hisaab",
  description: "View group spending leaderboard and member analytics",
};

export default async function GroupLeaderboardPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  // Verify user is part of the group
  const { data: membership } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", id)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  // Get group details
  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description")
    .eq("id", id)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  // Get leaderboard data
  const leaderboard = await getGroupMembersExpenseSummary(
    id,
    currentYear,
    currentMonth
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <GroupLeaderboardClient
          leaderboard={leaderboard}
          groupName={group.name}
          month={currentMonth}
          year={currentYear}
        />
      </div>
    </div>
  );
}
