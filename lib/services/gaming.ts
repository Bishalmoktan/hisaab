"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  Card,
  GameAction,
  GamePlayer,
  GamePlayerCards,
  GameRound,
  GameTable,
  GameTableWithPlayers,
  PlayerGameState,
} from "@/lib/game/types";
import type { User } from "@/lib/types";
import { createDeck, dealCards, shuffleDeck } from "@/lib/game/deck";
import { compareHands, evaluateHand, findWinner } from "@/lib/game/hand-evaluator";
import { revalidatePath } from "next/cache";
import { sendNotificationToUser } from "@/lib/actions/notify";

/**
 * Fetch all active/recent tables visible to the current user
 * (tables in user's groups OR waiting tables user can join).
 */
export async function getUserTables(): Promise<GameTableWithPlayers[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("game_tables")
    .select(
      `
      *,
      group:groups(*),
      creator:users!game_tables_created_by_fkey(*),
      players:game_players(
        *,
        user:users(*)
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getUserTables error:", error);
    return [];
  }

  return (data as unknown as GameTableWithPlayers[]) ?? [];
}

/**
 * Fetch a single game table by ID with players, group, and creator.
 */
export async function getTableById(
  tableId: string
): Promise<GameTableWithPlayers | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("game_tables")
    .select(
      `
      *,
      group:groups(*),
      creator:users!game_tables_created_by_fkey(*),
      players:game_players(
        *,
        user:users(*)
      )
    `
    )
    .eq("id", tableId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  // Sort players by seat_number
  const table = data as unknown as GameTableWithPlayers;
  table.players = (table.players ?? []).sort(
    (a, b) => a.seat_number - b.seat_number
  );

  return table;
}

/**
 * Create a new TeenPatti table.
 * If groupId is omitted or "auto", automatically generates a dedicated Hisaab group for this table!
 */
export async function createTable(
  name: string,
  groupId: string | "auto",
  minBet: number = 10,
  maxPlayers: number = 5,
  initialChips: number = 1000
): Promise<{ success: boolean; message?: string; table?: GameTable }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  let targetGroupId = groupId;

  // Auto-generate a group for this game board if requested
  if (!targetGroupId || targetGroupId === "auto") {
    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: `🃏 ${name.trim()}`,
        description: `Auto-generated TeenPatti gaming board for "${name.trim()}". Each round creates an expense owed to the round winner.`,
        created_by: user.id,
      })
      .select()
      .single();

    if (groupError || !newGroup) {
      return {
        success: false,
        message: groupError?.message ?? "Failed to create linked group",
      };
    }

    targetGroupId = newGroup.id;

    // Add creator as group admin
    await supabase.from("group_members").insert({
      group_id: targetGroupId,
      user_id: user.id,
      role: "admin",
    });
  } else {
    // Ensure creator is in the selected group
    const { data: existingMember } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", targetGroupId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existingMember) {
      await supabase.from("group_members").insert({
        group_id: targetGroupId,
        user_id: user.id,
        role: "member",
      });
    }
  }

  const { data: table, error: tableError } = await supabase
    .from("game_tables")
    .insert({
      name: name.trim(),
      group_id: targetGroupId,
      created_by: user.id,
      min_bet: Math.max(1, Number(minBet) || 10),
      max_players: Math.min(7, Math.max(2, Number(maxPlayers) || 5)),
      status: "waiting",
    })
    .select()
    .single();

  if (tableError || !table) {
    return {
      success: false,
      message: tableError?.message ?? "Failed to create table",
    };
  }

  // Seat creator at Seat 1
  const { error: playerError } = await supabase.from("game_players").insert({
    table_id: table.id,
    user_id: user.id,
    seat_number: 1,
    chip_balance: initialChips,
    is_active: true,
  });

  if (playerError) {
    return {
      success: false,
      message: playerError.message,
    };
  }

  revalidatePath("/gaming");
  revalidatePath("/groups");
  revalidatePath("/dashboard");

  return { success: true, table: table as GameTable };
}

/**
 * Sit on a table (at a specific seat or next available seat).
 * Automatically adds the user to the table's linked group so expenses work seamlessly!
 */
export async function joinTable(
  tableId: string,
  preferredSeat?: number,
  initialChips: number = 1000
): Promise<{ success: boolean; message?: string; seatNumber?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const table = await getTableById(tableId);
  if (!table) {
    return { success: false, message: "Table not found" };
  }

  if (table.status === "finished") {
    return { success: false, message: "This table has finished" };
  }

  // Check if user is already seated
  const existingPlayer = table.players.find((p) => p.user_id === user.id);
  if (existingPlayer) {
    return {
      success: true,
      seatNumber: existingPlayer.seat_number,
      message: "Already seated at this table",
    };
  }

  if (table.players.length >= table.max_players) {
    return { success: false, message: "Table is full" };
  }

  // Find available seat
  const takenSeats = new Set(table.players.map((p) => p.seat_number));
  let seatToTake: number | null = null;

  if (
    preferredSeat &&
    preferredSeat >= 1 &&
    preferredSeat <= table.max_players &&
    !takenSeats.has(preferredSeat)
  ) {
    seatToTake = preferredSeat;
  } else {
    for (let s = 1; s <= table.max_players; s++) {
      if (!takenSeats.has(s)) {
        seatToTake = s;
        break;
      }
    }
  }

  if (!seatToTake) {
    return { success: false, message: "No seats available" };
  }

  // Ensure user is a member of the linked expense group
  const { data: memberCheck } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", table.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!memberCheck) {
    await supabase.from("group_members").insert({
      group_id: table.group_id,
      user_id: user.id,
      role: "member",
    });
  }

  // Insert into game_players
  const { error: joinError } = await supabase.from("game_players").insert({
    table_id: tableId,
    user_id: user.id,
    seat_number: seatToTake,
    chip_balance: initialChips,
    is_active: true,
  });

  if (joinError) {
    return { success: false, message: joinError.message };
  }

  revalidatePath(`/gaming/tables/${tableId}`);
  revalidatePath("/gaming");
  revalidatePath(`/groups/${table.group_id}`);

  return { success: true, seatNumber: seatToTake };
}

/**
 * Leave a table. If creator leaves or no players remain, mark table as finished.
 */
export async function leaveTable(
  tableId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const table = await getTableById(tableId);
  if (!table) {
    return { success: false, message: "Table not found" };
  }

  // If there's an active round, fold the user first
  const { data: activeRound } = await supabase
    .from("game_rounds")
    .select("*")
    .eq("table_id", tableId)
    .in("status", ["dealing", "betting", "showdown"])
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRound) {
    await foldHand(activeRound.id);
  }

  const { error } = await supabase
    .from("game_players")
    .delete()
    .eq("table_id", tableId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  // Check remaining players
  const { data: remaining } = await supabase
    .from("game_players")
    .select("id")
    .eq("table_id", tableId);

  if (!remaining || remaining.length === 0) {
    await supabase
      .from("game_tables")
      .update({ status: "finished" })
      .eq("id", tableId);
  }

  revalidatePath(`/gaming/tables/${tableId}`);
  revalidatePath("/gaming");
  return { success: true };
}

/**
 * Close/finish the table (host only).
 */
export async function closeTable(
  tableId: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const { error } = await supabase
    .from("game_tables")
    .update({ status: "finished" })
    .eq("id", tableId)
    .eq("created_by", user.id);

  if (error) {
    return { success: false, message: error.message };
  }

  revalidatePath(`/gaming/tables/${tableId}`);
  revalidatePath("/gaming");
  return { success: true };
}

/**
 * Start a new round of TeenPatti on the table.
 * Shuffles a 52-card deck, deals 3 cards to each seated player, collects boot (ante), and sets turn.
 */
export async function startRound(
  tableId: string
): Promise<{ success: boolean; message?: string; roundId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const table = await getTableById(tableId);
  if (!table) {
    return { success: false, message: "Table not found" };
  }

  if (table.players.length < 2) {
    return {
      success: false,
      message: "At least 2 players must be seated to start a round",
    };
  }

  // Check if there is already an active round
  const { data: existingActive } = await supabase
    .from("game_rounds")
    .select("id")
    .eq("table_id", tableId)
    .in("status", ["dealing", "betting", "showdown"])
    .maybeSingle();

  if (existingActive) {
    return {
      success: false,
      message: "A round is already in progress",
    };
  }

  // Determine next round number
  const { data: lastRound } = await supabase
    .from("game_rounds")
    .select("round_number")
    .eq("table_id", tableId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextRoundNumber = (lastRound?.round_number ?? 0) + 1;
  const bootAmount = Number(table.min_bet);
  const players = table.players;
  const totalBootPot = bootAmount * players.length;

  // Shuffle & deal 3 cards per player
  const deck = shuffleDeck(createDeck());
  const { hands, remainingDeck } = dealCards(deck, players.length, 3);

  // Rotate starting player each round
  const firstTurnIndex = (nextRoundNumber - 1) % players.length;
  const firstTurnUserId = players[firstTurnIndex].user_id;

  // Create the round
  const { data: round, error: roundError } = await supabase
    .from("game_rounds")
    .insert({
      table_id: tableId,
      round_number: nextRoundNumber,
      pot_amount: totalBootPot,
      boot_amount: bootAmount,
      current_turn_user_id: firstTurnUserId,
      current_bet: bootAmount,
      status: "betting",
      cards_deck: remainingDeck,
    })
    .select()
    .single();

  if (roundError || !round) {
    return {
      success: false,
      message: roundError?.message ?? "Failed to create round",
    };
  }

  // Update table status to playing
  await supabase
    .from("game_tables")
    .update({ status: "playing" })
    .eq("id", tableId);

  // Reset all seated players to active and deduct boot amount
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    await supabase
      .from("game_players")
      .update({
        is_active: true,
        chip_balance: Number(p.chip_balance) - bootAmount,
      })
      .eq("id", p.id);
  }

  // Insert dealt cards for each player
  const cardRows = players.map((p, idx) => ({
    round_id: round.id,
    user_id: p.user_id,
    cards: hands[idx],
    is_seen: false,
  }));

  await supabase.from("game_player_cards").insert(cardRows);

  // Record boot actions for each player so pot contribution tracking is exact
  const bootActions = players.map((p, idx) => ({
    round_id: round.id,
    user_id: p.user_id,
    action_type: "boot" as const,
    amount: bootAmount,
    sequence: idx + 1,
  }));

  await supabase.from("game_actions").insert(bootActions);

  revalidatePath(`/gaming/tables/${tableId}`);
  revalidatePath("/gaming");

  return { success: true, roundId: round.id };
}

/**
 * Helper: Get next active player's user_id in seat order.
 */
export async function getNextTurn(
  tableId: string,
  currentUserId: string,
  roundId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("game_players")
    .select("*")
    .eq("table_id", tableId)
    .order("seat_number", { ascending: true });

  if (!players || players.length === 0) return null;

  const { data: foldActions } = await supabase
    .from("game_actions")
    .select("user_id")
    .eq("round_id", roundId)
    .in("action_type", ["fold", "pack"]);

  const foldedIds = new Set((foldActions ?? []).map((a) => a.user_id));
  const activePlayers = players.filter((p) => !foldedIds.has(p.user_id));

  if (activePlayers.length <= 1) return activePlayers[0]?.user_id ?? null;

  const currentIndex = players.findIndex((p) => p.user_id === currentUserId);
  for (let offset = 1; offset <= players.length; offset++) {
    const candidate = players[(currentIndex + offset) % players.length];
    if (!foldedIds.has(candidate.user_id)) {
      return candidate.user_id;
    }
  }

  return activePlayers[0]?.user_id ?? null;
}

/**
 * Get the full game state for the current user at a table.
 */
export async function getGameState(
  tableId: string
): Promise<PlayerGameState | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const table = await getTableById(tableId);
  if (!table) return null;

  // Fetch latest round for this table
  const { data: roundData } = await supabase
    .from("game_rounds")
    .select("*")
    .eq("table_id", tableId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const currentRound = (roundData as GameRound | null) ?? null;

  let myCards: Card[] | null = null;
  let isMySeen = false;
  let actions: (GameAction & { user: User })[] = [];
  let allPlayerCards: Record<string, { cards: Card[]; is_seen: boolean }> = {};

  if (currentRound) {
    // Get actions for this round
    const { data: actionsData } = await supabase
      .from("game_actions")
      .select(
        `
        *,
        user:users(*)
      `
      )
      .eq("round_id", currentRound.id)
      .order("sequence", { ascending: true });

    actions = (actionsData as unknown as (GameAction & { user: User })[]) ?? [];

    // Get player cards
    const { data: cardsData } = await supabase
      .from("game_player_cards")
      .select("*")
      .eq("round_id", currentRound.id);

    if (cardsData) {
      for (const row of cardsData as GamePlayerCards[]) {
        allPlayerCards[row.user_id] = {
          cards: row.cards,
          is_seen: row.is_seen,
        };
        if (row.user_id === user.id) {
          isMySeen = row.is_seen;
          // Only send actual card faces if player has seen them OR round is completed/showdown
          if (row.is_seen || currentRound.status === "completed" || currentRound.status === "showdown") {
            myCards = row.cards;
          }
        }
      }
    }
  }

  const foldedIds = new Set(
    actions
      .filter((a) => a.action_type === "fold" || a.action_type === "pack")
      .map((a) => a.user_id)
  );

  // Enrich players with current round active status and seen status
  const enrichedPlayers = table.players.map((p) => ({
    ...p,
    is_active: currentRound
      ? !foldedIds.has(p.user_id) && Boolean(allPlayerCards[p.user_id])
      : p.is_active,
    is_seen: allPlayerCards[p.user_id]?.is_seen ?? false,
    revealed_cards:
      currentRound?.status === "completed"
        ? allPlayerCards[p.user_id]?.cards ?? null
        : p.user_id === user.id && isMySeen
        ? myCards
        : null,
  }));

  table.players = enrichedPlayers;

  const activePlayers = enrichedPlayers.filter((p) => p.is_active);
  const myPlayer = enrichedPlayers.find((p) => p.user_id === user.id) ?? null;
  const isMyTurn =
    Boolean(currentRound) &&
    currentRound?.status === "betting" &&
    currentRound?.current_turn_user_id === user.id;

  const canShow = isMyTurn && activePlayers.length === 2;
  const canSideshow = isMyTurn && activePlayers.length > 2 && isMySeen;

  return {
    table,
    currentRound,
    myCards,
    isMySeen,
    actions,
    myPlayer,
    isMyTurn,
    canShow,
    canSideshow,
    activePlayers,
  };
}

/**
 * Mark current player's cards as seen ("See Cards").
 */
export async function seeCards(
  roundId: string,
  actingUserId?: string
): Promise<{ success: boolean; message?: string; cards?: Card[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const targetUserId = actingUserId || user.id;

  const { data: cardRow, error } = await supabase
    .from("game_player_cards")
    .update({ is_seen: true })
    .eq("round_id", roundId)
    .eq("user_id", targetUserId)
    .select("*")
    .single();

  if (error || !cardRow) {
    return {
      success: false,
      message: error?.message ?? "Could not reveal cards",
    };
  }

  const { data: round } = await supabase
    .from("game_rounds")
    .select("table_id")
    .eq("id", roundId)
    .single();

  if (round) {
    revalidatePath(`/gaming/tables/${round.table_id}`);
  }

  return {
    success: true,
    cards: (cardRow as GamePlayerCards).cards,
  };
}

/**
 * Place a bet (Chaal / Blind / Raise).
 * In TeenPatti:
 * - Blind player bets at least current_bet (1x) or raises to 2x current_bet
 * - Seen player bets at least 2x current_bet (if current_bet is blind unit) or matches seen bet
 */
export async function placeBet(
  roundId: string,
  amount: number,
  isRaise: boolean = false,
  actingUserId?: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const actorId = actingUserId || user.id;

  const { data: roundData } = await supabase
    .from("game_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!roundData) {
    return { success: false, message: "Round not found" };
  }

  const round = roundData as GameRound;
  if (round.status !== "betting") {
    return { success: false, message: "Round is not in betting phase" };
  }

  if (round.current_turn_user_id !== actorId) {
    return { success: false, message: "It is not this player's turn" };
  }

  // Check if player has seen their cards
  const { data: cardRow } = await supabase
    .from("game_player_cards")
    .select("is_seen")
    .eq("round_id", roundId)
    .eq("user_id", actorId)
    .single();

  const isSeen = cardRow?.is_seen ?? false;
  const minRequired = isSeen ? Number(round.current_bet) * 2 : Number(round.current_bet);
  const betAmount = Math.max(minRequired, Number(amount));

  // Get player's current chip balance
  const { data: player } = await supabase
    .from("game_players")
    .select("*")
    .eq("table_id", round.table_id)
    .eq("user_id", actorId)
    .single();

  if (!player) {
    return { success: false, message: "Player not seated at this table" };
  }

  // Deduct from player's chip balance
  await supabase
    .from("game_players")
    .update({
      chip_balance: Number(player.chip_balance) - betAmount,
    })
    .eq("id", player.id);

  // Get next action sequence
  const { data: lastAction } = await supabase
    .from("game_actions")
    .select("sequence")
    .eq("round_id", roundId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = (lastAction?.sequence ?? 0) + 1;

  // Record action
  await supabase.from("game_actions").insert({
    round_id: roundId,
    user_id: actorId,
    action_type: isRaise ? "raise" : "bet",
    amount: betAmount,
    sequence: nextSeq,
  });

  // Update pot and advance turn
  const nextTurnUserId = await getNextTurn(round.table_id, actorId, roundId);
  const newBaseBet = isSeen ? Math.max(Number(round.current_bet), betAmount / 2) : Math.max(Number(round.current_bet), betAmount);

  await supabase
    .from("game_rounds")
    .update({
      pot_amount: Number(round.pot_amount) + betAmount,
      current_bet: newBaseBet,
      current_turn_user_id: nextTurnUserId,
    })
    .eq("id", roundId);

  revalidatePath(`/gaming/tables/${round.table_id}`);
  return { success: true };
}

/**
 * Fold / Pack hand.
 * If only 1 active player remains after folding, that player wins automatically!
 */
export async function foldHand(
  roundId: string,
  actingUserId?: string
): Promise<{ success: boolean; message?: string; winnerId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const actorId = actingUserId || user.id;

  const { data: roundData } = await supabase
    .from("game_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!roundData) {
    return { success: false, message: "Round not found" };
  }

  const round = roundData as GameRound;
  if (round.status !== "betting") {
    return { success: false, message: "Round is no longer active" };
  }

  // Get next sequence
  const { data: lastAction } = await supabase
    .from("game_actions")
    .select("sequence")
    .eq("round_id", roundId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = (lastAction?.sequence ?? 0) + 1;

  await supabase.from("game_actions").insert({
    round_id: roundId,
    user_id: actorId,
    action_type: "fold",
    amount: 0,
    sequence: nextSeq,
  });

  await supabase
    .from("game_players")
    .update({ is_active: false })
    .eq("table_id", round.table_id)
    .eq("user_id", actorId);

  // Check how many active players remain
  const { data: allDealtPlayers } = await supabase
    .from("game_player_cards")
    .select("user_id")
    .eq("round_id", roundId);

  const { data: foldActions } = await supabase
    .from("game_actions")
    .select("user_id")
    .eq("round_id", roundId)
    .in("action_type", ["fold", "pack"]);

  const foldedSet = new Set((foldActions ?? []).map((f) => f.user_id));
  const remainingPlayers = (allDealtPlayers ?? []).filter(
    (p) => !foldedSet.has(p.user_id)
  );

  if (remainingPlayers.length === 1) {
    const winnerId = remainingPlayers[0].user_id;
    await endRound(roundId, winnerId);
    return { success: true, winnerId };
  }

  // If the folding player had the current turn, advance turn
  if (round.current_turn_user_id === actorId) {
    const nextTurn = await getNextTurn(round.table_id, actorId, roundId);
    await supabase
      .from("game_rounds")
      .update({ current_turn_user_id: nextTurn })
      .eq("id", roundId);
  }

  revalidatePath(`/gaming/tables/${round.table_id}`);
  return { success: true };
}

/**
 * Request a Showdown (when 2 players remain) or Sideshow (compare with previous active player).
 */
export async function requestShow(
  roundId: string,
  actingUserId?: string
): Promise<{
  success: boolean;
  message?: string;
  winnerId?: string;
  winningHand?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const actorId = actingUserId || user.id;

  const { data: roundData } = await supabase
    .from("game_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!roundData) {
    return { success: false, message: "Round not found" };
  }

  const round = roundData as GameRound;
  if (round.status !== "betting") {
    return { success: false, message: "Round is not in betting phase" };
  }

  if (round.current_turn_user_id !== actorId) {
    return { success: false, message: "It is not this player's turn" };
  }

  // Check if player is seen for show cost calculation
  const { data: myCardRow } = await supabase
    .from("game_player_cards")
    .select("*")
    .eq("round_id", roundId)
    .eq("user_id", actorId)
    .single();

  const isSeen = myCardRow?.is_seen ?? false;
  const showCost = isSeen ? Number(round.current_bet) * 2 : Number(round.current_bet);

  // Deduct show cost from player's chips and add to pot
  const { data: player } = await supabase
    .from("game_players")
    .select("*")
    .eq("table_id", round.table_id)
    .eq("user_id", actorId)
    .single();

  if (player) {
    await supabase
      .from("game_players")
      .update({ chip_balance: Number(player.chip_balance) - showCost })
      .eq("id", player.id);
  }

  const { data: lastAction } = await supabase
    .from("game_actions")
    .select("sequence")
    .eq("round_id", roundId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = (lastAction?.sequence ?? 0) + 1;

  await supabase.from("game_actions").insert({
    round_id: roundId,
    user_id: actorId,
    action_type: "show",
    amount: showCost,
    sequence: nextSeq,
  });

  const newPotAmount = Number(round.pot_amount) + showCost;
  await supabase
    .from("game_rounds")
    .update({ pot_amount: newPotAmount, status: "showdown" })
    .eq("id", roundId);

  // Get all non-folded players' cards
  const { data: allCards } = await supabase
    .from("game_player_cards")
    .select("*")
    .eq("round_id", roundId);

  const { data: foldActions } = await supabase
    .from("game_actions")
    .select("user_id")
    .eq("round_id", roundId)
    .in("action_type", ["fold", "pack"]);

  const foldedSet = new Set((foldActions ?? []).map((f) => f.user_id));

  const activeHands = ((allCards as GamePlayerCards[]) ?? [])
    .filter((c) => !foldedSet.has(c.user_id))
    .map((c) => ({
      userId: c.user_id,
      cards: c.cards,
    }));

  if (activeHands.length === 0) {
    return { success: false, message: "No active hands found" };
  }

  // Reveal all remaining active hands
  for (const h of activeHands) {
    await supabase
      .from("game_player_cards")
      .update({ is_seen: true })
      .eq("round_id", roundId)
      .eq("user_id", h.userId);
  }

  // Evaluate hands: In TeenPatti, if two hands are tied in a Show, the player who did NOT request the Show wins
  let winner = findWinner(activeHands);
  if (activeHands.length === 2) {
    const otherPlayer = activeHands.find((h) => h.userId !== actorId);
    const myHand = activeHands.find((h) => h.userId === actorId);
    if (otherPlayer && myHand) {
      const cmp = compareHands(myHand.cards, otherPlayer.cards);
      if (cmp > 0) {
        winner = {
          userId: myHand.userId,
          cards: myHand.cards,
          evaluation: evaluateHand(myHand.cards),
        };
      } else {
        // Other player wins on tie or higher hand
        winner = {
          userId: otherPlayer.userId,
          cards: otherPlayer.cards,
          evaluation: evaluateHand(otherPlayer.cards),
        };
      }
    }
  }

  await endRound(roundId, winner.userId);

  return {
    success: true,
    winnerId: winner.userId,
    winningHand: winner.evaluation.description,
  };
}

/**
 * Request a Sideshow with the previous active player (when > 2 active players remain).
 * Compares the current player's cards with the previous active player's cards; loser folds automatically.
 */
export async function requestSideshow(
  roundId: string,
  actingUserId?: string
): Promise<{
  success: boolean;
  message?: string;
  loserFoldedUserId?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const actorId = actingUserId || user.id;

  const { data: roundData } = await supabase
    .from("game_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!roundData) {
    return { success: false, message: "Round not found" };
  }

  const round = roundData as GameRound;
  if (round.status !== "betting" || round.current_turn_user_id !== actorId) {
    return { success: false, message: "It is not this player's turn" };
  }

  // Find previous active player in seat order
  const { data: players } = await supabase
    .from("game_players")
    .select("*")
    .eq("table_id", round.table_id)
    .order("seat_number", { ascending: true });

  const { data: foldActions } = await supabase
    .from("game_actions")
    .select("user_id")
    .eq("round_id", roundId)
    .in("action_type", ["fold", "pack"]);

  const foldedSet = new Set((foldActions ?? []).map((a) => a.user_id));
  const activePlayers = (players ?? []).filter(
    (p) => !foldedSet.has(p.user_id)
  );

  if (activePlayers.length <= 2) {
    const showRes = await requestShow(roundId, actorId);
    return { success: showRes.success, message: showRes.message };
  }

  const myIdx = activePlayers.findIndex((p) => p.user_id === actorId);
  const prevPlayer =
    activePlayers[(myIdx - 1 + activePlayers.length) % activePlayers.length];

  // Cost of sideshow is seen bet (2x current_bet)
  const sideshowCost = Number(round.current_bet) * 2;
  const myPlayerRecord = activePlayers[myIdx];

  await supabase
    .from("game_players")
    .update({
      chip_balance: Number(myPlayerRecord.chip_balance) - sideshowCost,
    })
    .eq("id", myPlayerRecord.id);

  // Get cards of both players
  const { data: pairCards } = await supabase
    .from("game_player_cards")
    .select("*")
    .eq("round_id", roundId)
    .in("user_id", [actorId, prevPlayer.user_id]);

  const myCards = (pairCards as GamePlayerCards[] | null)?.find(
    (c) => c.user_id === actorId
  )?.cards;
  const prevCards = (pairCards as GamePlayerCards[] | null)?.find(
    (c) => c.user_id === prevPlayer.user_id
  )?.cards;

  if (!myCards || !prevCards) {
    return { success: false, message: "Could not compare cards for sideshow" };
  }

  const cmp = compareHands(myCards, prevCards);
  // If challenger (actorId) is strictly higher, prevPlayer folds; otherwise challenger folds
  const loserUserId = cmp > 0 ? prevPlayer.user_id : actorId;

  const { data: lastAction } = await supabase
    .from("game_actions")
    .select("sequence")
    .eq("round_id", roundId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  const seq = (lastAction?.sequence ?? 0) + 1;

  // Record sideshow action + fold action for loser
  await supabase.from("game_actions").insert([
    {
      round_id: roundId,
      user_id: actorId,
      action_type: "sideshow",
      amount: sideshowCost,
      sequence: seq,
    },
    {
      round_id: roundId,
      user_id: loserUserId,
      action_type: "fold",
      amount: 0,
      sequence: seq + 1,
    },
  ]);

  await supabase
    .from("game_players")
    .update({ is_active: false })
    .eq("table_id", round.table_id)
    .eq("user_id", loserUserId);

  const nextTurn = await getNextTurn(round.table_id, actorId, roundId);
  await supabase
    .from("game_rounds")
    .update({
      pot_amount: Number(round.pot_amount) + sideshowCost,
      current_turn_user_id: nextTurn,
    })
    .eq("id", roundId);

  revalidatePath(`/gaming/tables/${round.table_id}`);
  return { success: true, loserFoldedUserId: loserUserId };
}

/**
 * Conclude a round:
 * 1. Award pot to winner's chip_balance
 * 2. Calculate each player's total contribution to the pot in this round
 * 3. Automatically create an Expense in the table's linked group where:
 *    - paid_by = winnerId (the winner is owed the pot by the other players)
 *    - total_amount = pot_amount
 *    - expense_splits = each player's contribution (winner's split is 'approved', losers' splits are 'pending' so they owe the winner!)
 */
export async function endRound(
  roundId: string,
  winnerId: string
): Promise<{ success: boolean; message?: string; expenseId?: string }> {
  const supabase = await createClient();

  const { data: roundData } = await supabase
    .from("game_rounds")
    .select("*")
    .eq("id", roundId)
    .single();

  if (!roundData) {
    return { success: false, message: "Round not found" };
  }

  const round = roundData as GameRound;
  if (round.status === "completed") {
    return { success: true, expenseId: round.expense_id ?? undefined };
  }

  const table = await getTableById(round.table_id);
  if (!table) {
    return { success: false, message: "Table not found" };
  }

  // Get all actions in this round to compute each player's exact contribution to the pot
  const { data: actions } = await supabase
    .from("game_actions")
    .select("*")
    .eq("round_id", roundId);

  const contributions = new Map<string, number>();
  for (const act of (actions as GameAction[]) ?? []) {
    const amt = Number(act.amount) || 0;
    if (amt > 0) {
      contributions.set(
        act.user_id,
        (contributions.get(act.user_id) ?? 0) + amt
      );
    }
  }

  const totalPot = Array.from(contributions.values()).reduce(
    (sum, v) => sum + v,
    0
  );
  const finalPot = totalPot > 0 ? totalPot : Number(round.pot_amount);

  // Credit winner's chip balance
  const winnerPlayer = table.players.find((p) => p.user_id === winnerId);
  if (winnerPlayer) {
    await supabase
      .from("game_players")
      .update({
        chip_balance: Number(winnerPlayer.chip_balance) + finalPot,
      })
      .eq("id", winnerPlayer.id);
  }

  // Get winner's winning hand description if available
  const { data: winnerCardsRow } = await supabase
    .from("game_player_cards")
    .select("*")
    .eq("round_id", roundId)
    .eq("user_id", winnerId)
    .maybeSingle();

  const handDesc = winnerCardsRow?.cards
    ? evaluateHand((winnerCardsRow as GamePlayerCards).cards).description
    : "Last Player Standing";

  const winnerName =
    winnerPlayer?.user?.name || "Winner";

  // Create the Expense in the linked group
  let createdExpenseId: string | null = null;

  if (finalPot > 0 && contributions.size > 0) {
    const today = new Date().toISOString().split("T")[0];
    const expenseTitle = `🃏 TeenPatti #${round.round_number} — ${table.name} (Won by ${winnerName})`;
    const expenseNotes = `TeenPatti Round #${round.round_number} at table "${table.name}". Won by ${winnerName} (${handDesc}). Total Pot: ₹${finalPot}.`;

    // Try inserting with description (matching createExpense in expenses.ts), fallback to notes
    let { data: expense, error: expError } = await supabase
      .from("expenses")
      .insert({
        group_id: table.group_id,
        paid_by: winnerId,
        title: expenseTitle,
        total_amount: finalPot,
        date: today,
        description: expenseNotes,
      } as any)
      .select()
      .single();

    if (expError) {
      const retry = await supabase
        .from("expenses")
        .insert({
          group_id: table.group_id,
          paid_by: winnerId,
          title: expenseTitle,
          total_amount: finalPot,
          date: today,
          notes: expenseNotes,
        } as any)
        .select()
        .single();
      expense = retry.data;
      expError = retry.error;
    }

    if (!expError && expense) {
      createdExpenseId = expense.id;

      // Create splits for each player who contributed to the pot
      const splitRows = Array.from(contributions.entries()).map(
        ([uid, amountOwed]) => ({
          expense_id: expense.id,
          user_id: uid,
          amount_owed: amountOwed,
          status:
            uid === winnerId ? ("approved" as const) : ("pending" as const),
          approved_at: uid === winnerId ? new Date().toISOString() : null,
        })
      );

      await supabase.from("expense_splits").insert(splitRows);

      // Notify players of the round outcome and expense
      for (const [uid, amt] of Array.from(contributions.entries())) {
        if (uid !== winnerId) {
          try {
            await sendNotificationToUser(uid, {
              title: `🃏 ${winnerName} won TeenPatti Round #${round.round_number}!`,
              body: `You owe ₹${amt} to ${winnerName} (${handDesc}) in "${table.name}"`,
              url: `/expenses/${expense.id}`,
            });
          } catch {
            // Ignore push notification errors
          }
        }
      }
    } else if (expError) {
      console.error("Failed to create game expense:", expError);
    }
  }

  // Mark round as completed
  await supabase
    .from("game_rounds")
    .update({
      winner_id: winnerId,
      pot_amount: finalPot,
      status: "completed",
      ended_at: new Date().toISOString(),
      expense_id: createdExpenseId,
    })
    .eq("id", roundId);

  revalidatePath(`/gaming/tables/${round.table_id}`);
  revalidatePath("/gaming");
  revalidatePath(`/groups/${table.group_id}`);
  revalidatePath("/dashboard");

  return {
    success: true,
    expenseId: createdExpenseId ?? undefined,
  };
}

/**
 * Get registered users so the host can seat friends from Hisaab onto the table board.
 */
export async function getAvailableUsersForTable(
  tableId: string
): Promise<User[]> {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("name", { ascending: true });

  const { data: seated } = await supabase
    .from("game_players")
    .select("user_id")
    .eq("table_id", tableId);

  const seatedSet = new Set((seated ?? []).map((s) => s.user_id));
  return ((users as User[]) ?? []).filter((u) => !seatedSet.has(u.id));
}

/**
 * Seat a specific Hisaab user at the table and add them to the table's expense group.
 */
export async function seatMemberAtTable(
  tableId: string,
  targetUserId: string,
  preferredSeat?: number,
  initialChips: number = 1000
): Promise<{ success: boolean; message?: string; seatNumber?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const table = await getTableById(tableId);
  if (!table) {
    return { success: false, message: "Table not found" };
  }

  if (table.players.some((p) => p.user_id === targetUserId)) {
    return { success: false, message: "Player is already seated at this table" };
  }

  if (table.players.length >= table.max_players) {
    return { success: false, message: "Table is full" };
  }

  const takenSeats = new Set(table.players.map((p) => p.seat_number));
  let seatToTake: number | null = null;

  if (
    preferredSeat &&
    preferredSeat >= 1 &&
    preferredSeat <= table.max_players &&
    !takenSeats.has(preferredSeat)
  ) {
    seatToTake = preferredSeat;
  } else {
    for (let s = 1; s <= table.max_players; s++) {
      if (!takenSeats.has(s)) {
        seatToTake = s;
        break;
      }
    }
  }

  if (!seatToTake) {
    return { success: false, message: "No open seats available" };
  }

  // Ensure target user is in the linked group
  const { data: memberCheck } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", table.group_id)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!memberCheck) {
    await supabase.from("group_members").insert({
      group_id: table.group_id,
      user_id: targetUserId,
      role: "member",
    });
  }

  const { error: joinError } = await supabase.from("game_players").insert({
    table_id: tableId,
    user_id: targetUserId,
    seat_number: seatToTake,
    chip_balance: initialChips,
    is_active: true,
  });

  if (joinError) {
    return { success: false, message: joinError.message };
  }

  revalidatePath(`/gaming/tables/${tableId}`);
  revalidatePath("/gaming");
  revalidatePath(`/groups/${table.group_id}`);

  return { success: true, seatNumber: seatToTake };
}

