"use server";

import { createClient } from "@/lib/supabase/server";
import type { Group, GroupInvite, GroupWithMembers } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function getUserGroups(): Promise<GroupWithMembers[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("groups")
    .select(
      `
      *,
      members:group_members!inner(
        *,
        user:users(*)
      )
    `,
    )
    .eq("group_members.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserGroups error:", error);
    return [];
  }

  return (data as GroupWithMembers[]) ?? [];
}

export async function getGroupById(
  groupId: string,
): Promise<GroupWithMembers | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("groups")
    .select(
      `
      *,
      members:group_members(
        *,
        user:users(*)
      )
    `,
    )
    .eq("id", groupId)
    .maybeSingle();

  if (error || !data) return null;
  return data as GroupWithMembers;
}

export async function createGroup(
  name: string,
  description: string,
): Promise<{ success: boolean; message?: string; group?: Group }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({
      name: name.trim(),
      description: description.trim(),
      created_by: user.id,
    })
    .select()
    .single();

  if (groupError || !group) {
    return { success: false, message: groupError?.message ?? "Failed to create group" };
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });

  if (memberError) {
    return { success: false, message: "Failed to add creator as admin" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/groups");
  return { success: true, group: group as Group };
}

export async function inviteMemberByEmail(groupId: string, email: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  // Check if user exists
  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existingUser) {
    // Add directly as member
    const userId = (existingUser as { id: string }).id;
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId, role: "member" });

    if (error && !error.message.includes("duplicate")) {
      return { success: false, message: error.message };
    }
    revalidatePath(`/groups/${groupId}`);
    return { success: true, type: "added" as const };
  }

  // Create invite for non-existing user
  const { data: inviteData, error: inviteError } = await supabase
    .from("group_invites")
    .insert({
      group_id: groupId,
      email: email.toLowerCase().trim(),
      invited_by: user.id,
    })
    .select()
    .single();

  if (inviteError) {
    if (inviteError.message.includes("duplicate")) {
      return {
        success: false,
        message: "An invite has already been sent to this email",
      };
    }

    return {
      success: false,
      message: inviteError.message,
    };
  }

  supabase.functions
    .invoke("send-invite-email", {
      body: {
        email,
        token: inviteData.token,
        invitedBy: user.id,
        groupId,
      },
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    })
    .then(() => console.log("Invite Email function triggered"))
    .catch((error) =>
      console.error("Error invoking send-invite-email:", error),
    );

  const invite = inviteData as GroupInvite;
  revalidatePath(`/groups/${groupId}`);
  return { success: true, type: "invited" as const, token: invite.token };
}

export async function removeMember(
  groupId: string,
  userId: string,
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    return { success: false, message: error.message };
  }
  revalidatePath(`/groups/${groupId}`);
  return { success: true };
}

export async function acceptInvite(
  token: string,
): Promise<{ success: boolean; message?: string; groupId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "NOT_AUTHENTICATED" };
  }

  const { data: inviteRaw, error: inviteError } = await supabase
    .from("group_invites")
    .select("*")
    .eq("token", token)
    .is("accepted_at", null)
    .maybeSingle();

  if (inviteError || !inviteRaw) {
    return { success: false, message: "Invalid or expired invite" };
  }
  const invite = inviteRaw as GroupInvite;

  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return {
      success: false,
      message: "This invite was sent to a different email",
    };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { success: false, message: "Invite has expired" };
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: invite.group_id, user_id: user.id, role: "member" });

  if (memberError && !memberError.message.includes("duplicate")) {
    return { success: false, message: memberError.message };
  }

  await supabase
    .from("group_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  revalidatePath("/dashboard");
  return { success: true, groupId: invite.group_id };
}
