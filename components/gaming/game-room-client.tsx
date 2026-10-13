'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useGameRealtime } from '@/hooks/use-game-realtime';
import type { PlayerGameState } from '@/lib/game/types';
import type { User } from '@/lib/types';
import {
  joinTable,
  leaveTable,
  startRound,
  seeCards,
  placeBet,
  foldHand,
  requestShow,
  requestSideshow,
  seatMemberAtTable,
} from '@/lib/services/gaming';
import { BettingControls } from './ui/betting-controls';
import { GameLog } from './ui/game-log';
import { HandRankingGuide } from './ui/hand-ranking-guide';
import { RoundResultBanner } from './ui/round-result-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  ArrowLeft,
  UserPlus,
  LogOut,
  Receipt,
  Coins,
  Users,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

const GameScene = dynamic(
  () => import('./three/game-scene').then((m) => m.GameScene),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[460px] sm:h-[540px] lg:h-[600px] rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-medium">Loading 3D TeenPatti Casino Table...</p>
      </div>
    ),
  }
);

interface GameRoomClientProps {
  initialGameState: PlayerGameState;
  currentUserId: string;
  availableUsers: User[];
}

export function GameRoomClient({
  initialGameState,
  currentUserId,
  availableUsers,
}: GameRoomClientProps) {
  const router = useRouter();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [seatFriendOpen, setSeatFriendOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>('');
  // Shared Board Mode lets the table keeper act for whichever seated friend's turn it is (great for playing around one table/screen!)
  const [boardKeeperMode, setBoardKeeperMode] = useState<boolean>(false);

  const { table, currentRound } = initialGameState;

  useGameRealtime({
    tableId: table.id,
    roundId: currentRound?.id ?? null,
  });

  // If Board Keeper Mode is enabled and a round is in betting, allow controlling the current turn player
  const activeTurnUserId =
    boardKeeperMode && currentRound?.status === 'betting' && currentRound.current_turn_user_id
      ? currentRound.current_turn_user_id
      : currentUserId;

  const effectivePlayer =
    table.players.find((p) => p.user_id === activeTurnUserId) ??
    initialGameState.myPlayer;

  const effectiveGameState: PlayerGameState = boardKeeperMode
    ? {
        ...initialGameState,
        myPlayer: effectivePlayer,
        isMyTurn:
          Boolean(currentRound) &&
          currentRound?.status === 'betting' &&
          currentRound?.current_turn_user_id === activeTurnUserId,
        isMySeen: effectivePlayer?.is_seen ?? false,
        myCards: effectivePlayer?.revealed_cards ?? initialGameState.myCards,
        canShow:
          Boolean(currentRound) &&
          currentRound?.status === 'betting' &&
          currentRound?.current_turn_user_id === activeTurnUserId &&
          initialGameState.activePlayers.length === 2,
        canSideshow:
          Boolean(currentRound) &&
          currentRound?.status === 'betting' &&
          currentRound?.current_turn_user_id === activeTurnUserId &&
          initialGameState.activePlayers.length > 2 &&
          Boolean(effectivePlayer?.is_seen),
      }
    : initialGameState;

  const handleSitAtSeat = async (seatNumber: number) => {
    setLoadingAction('sit');
    const res = await joinTable(table.id, seatNumber);
    if (!res.success) {
      toast.error(res.message || 'Could not sit at seat');
      setLoadingAction(null);
      return;
    }
    toast.success(`Seated at Seat #${res.seatNumber}! Added to group board.`);
    router.refresh();
    setLoadingAction(null);
  };

  const handleSeatFriend = async () => {
    if (!selectedFriendId) {
      toast.error('Select a friend to seat at the table');
      return;
    }
    setLoadingAction('seat-friend');
    const res = await seatMemberAtTable(table.id, selectedFriendId);
    if (!res.success) {
      toast.error(res.message || 'Could not seat friend');
      setLoadingAction(null);
      return;
    }
    toast.success(`Friend seated at Seat #${res.seatNumber} and added to group!`);
    setSelectedFriendId('');
    setSeatFriendOpen(false);
    router.refresh();
    setLoadingAction(null);
  };

  const handleLeaveTable = async () => {
    setLoadingAction('leave');
    const res = await leaveTable(table.id);
    if (!res.success) {
      toast.error(res.message || 'Failed to leave table');
      setLoadingAction(null);
      return;
    }
    toast.success('Left the table');
    router.push('/gaming');
  };

  const handleStartRound = async () => {
    setLoadingAction('start');
    const res = await startRound(table.id);
    if (!res.success) {
      toast.error(res.message || 'Could not start round');
      setLoadingAction(null);
      return;
    }
    toast.success('Cards dealt! Boot collected into the pot.');
    router.refresh();
    setLoadingAction(null);
  };

  const handleSeeCards = async () => {
    if (!currentRound) return;
    setLoadingAction('see');
    const res = await seeCards(currentRound.id, activeTurnUserId);
    if (!res.success) {
      toast.error(res.message || 'Could not see cards');
      setLoadingAction(null);
      return;
    }
    toast.success('Cards revealed! You are now playing Seen (Chaal).');
    router.refresh();
    setLoadingAction(null);
  };

  const handleBet = async (amount: number, isRaise: boolean) => {
    if (!currentRound) return;
    setLoadingAction(isRaise ? 'raise' : 'bet');
    const res = await placeBet(currentRound.id, amount, isRaise, activeTurnUserId);
    if (!res.success) {
      toast.error(res.message || 'Failed to place bet');
      setLoadingAction(null);
      return;
    }
    router.refresh();
    setLoadingAction(null);
  };

  const handleFold = async () => {
    if (!currentRound) return;
    setLoadingAction('fold');
    const res = await foldHand(currentRound.id, activeTurnUserId);
    if (!res.success) {
      toast.error(res.message || 'Failed to pack hand');
      setLoadingAction(null);
      return;
    }
    if (res.winnerId) {
      toast.success('Round finished! Expense automatically created for the winner.');
    } else {
      toast.info('Hand packed');
    }
    router.refresh();
    setLoadingAction(null);
  };

  const handleShow = async () => {
    if (!currentRound) return;
    setLoadingAction('show');
    const res = await requestShow(currentRound.id, activeTurnUserId);
    if (!res.success) {
      toast.error(res.message || 'Showdown failed');
      setLoadingAction(null);
      return;
    }
    toast.success(
      `Showdown complete! Winning hand: ${res.winningHand}. Group expense created!`
    );
    router.refresh();
    setLoadingAction(null);
  };

  const handleSideshow = async () => {
    if (!currentRound) return;
    setLoadingAction('sideshow');
    const res = await requestSideshow(currentRound.id, activeTurnUserId);
    if (!res.success) {
      toast.error(res.message || 'Sideshow failed');
      setLoadingAction(null);
      return;
    }
    const loserName =
      table.players.find((p) => p.user_id === res.loserFoldedUserId)?.user
        ?.name || 'Player';
    toast.info(`Sideshow compared! ${loserName} had the lower hand and packed.`);
    router.refresh();
    setLoadingAction(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-5 space-y-4">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/gaming">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 truncate">
                {table.name}
              </h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                <Coins className="w-3 h-3 mr-1" />
                Boot ₹{Number(table.min_bet)}
              </Badge>
              {currentRound && (
                <Badge className="bg-slate-900 text-white">
                  Round #{currentRound.round_number}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span>Linked Expense Group:</span>
              <Link
                href={`/groups/${table.group_id}`}
                className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                <Receipt className="w-3 h-3" />
                {table.group?.name || 'View Group Board'}
              </Link>
            </div>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Board Keeper Mode switch (Pass & Play / Single Screen Board Control) */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs">
            <Switch
              id="board-keeper-mode"
              checked={boardKeeperMode}
              onCheckedChange={setBoardKeeperMode}
            />
            <Label htmlFor="board-keeper-mode" className="cursor-pointer font-medium text-slate-700">
              Shared Board Mode
            </Label>
          </div>

          {/* Seat a Friend from Hisaab */}
          {table.players.length < table.max_players && (
            <Dialog open={seatFriendOpen} onOpenChange={setSeatFriendOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                  Seat a Friend ({table.players.length}/{table.max_players})
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    Seat a Friend on the Table
                  </DialogTitle>
                  <DialogDescription>
                    Add a registered friend to an open seat on this TeenPatti table. They will also be added to the table&apos;s expense group!
                  </DialogDescription>
                </DialogHeader>

                {availableUsers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 text-xs text-slate-500">
                    All registered users in your workspace are already seated, or share this page URL with friends so they can log in and sit at the table!
                  </div>
                ) : (
                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label>Select Friend</Label>
                      <Select
                        value={selectedFriendId}
                        onValueChange={setSelectedFriendId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a user to seat..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => setSeatFriendOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSeatFriend}
                        disabled={loadingAction === 'seat-friend'}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {loadingAction === 'seat-friend' && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Seat at Table
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          )}

          <HandRankingGuide />

          {initialGameState.myPlayer && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeaveTable}
              disabled={loadingAction === 'leave'}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs"
            >
              <LogOut className="w-3.5 h-3.5 mr-1" />
              Leave Seat
            </Button>
          )}
        </div>
      </div>

      {boardKeeperMode && (
        <div className="px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Shared Board Mode Active:</strong> You can control the betting actions for whichever seated player&apos;s turn it currently is—ideal when keeping a live TeenPatti board for friends around a physical table!
            </span>
          </span>
        </div>
      )}

      {/* Round Winner Announcement Banner (with Expense Link!) */}
      <RoundResultBanner
        gameState={effectiveGameState}
        onNextRound={handleStartRound}
        loadingNext={loadingAction === 'start'}
      />

      {/* 3D Three.js Casino Table Scene */}
      <GameScene
        gameState={effectiveGameState}
        currentUserId={activeTurnUserId}
        onSitAtSeat={handleSitAtSeat}
        onSeeCards={handleSeeCards}
      />

      {/* Betting & Dealing Controls */}
      <BettingControls
        gameState={effectiveGameState}
        loadingAction={loadingAction}
        onStartRound={handleStartRound}
        onSeeCards={handleSeeCards}
        onBet={handleBet}
        onFold={handleFold}
        onShow={handleShow}
        onSideshow={handleSideshow}
      />

      {/* Table Chip Standings & Live Action Feed */}
      <GameLog
        actions={effectiveGameState.actions}
        players={table.players}
        groupId={table.group_id}
        groupName={table.group?.name || 'Group'}
        latestExpenseId={currentRound?.expense_id}
      />
    </div>
  );
}

