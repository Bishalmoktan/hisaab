'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRealtimeRefresh } from '@/hooks/use-realtime-refresh';
import type { GameTableWithPlayers } from '@/lib/game/types';
import type { GroupWithMembers } from '@/lib/types';
import { CreateTableModal } from './create-table-modal';
import { HandRankingGuide } from './ui/hand-ranking-guide';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Gamepad2,
  Users,
  Coins,
  ArrowRight,
  Sparkles,
  Receipt,
  FolderKanban,
} from 'lucide-react';

interface GamingLandingClientProps {
  tables: GameTableWithPlayers[];
  groups: GroupWithMembers[];
  currentUserId: string;
}

export function GamingLandingClient({
  tables,
  groups,
  currentUserId,
}: GamingLandingClientProps) {
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useRealtimeRefresh([
    { table: 'game_tables' },
    { table: 'game_players' },
  ]);

  const filteredTables = tables.filter((t) =>
    filter === 'active' ? t.status !== 'finished' : true
  );

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Casino Royale Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white p-6 sm:p-8 border border-emerald-800/50 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              3D Multiplayer Gaming • Auto Hisaab Expenses
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
              <span>🃏 TeenPatti 3D Table Board</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Sit at a realistic 3D TeenPatti table with your friends. When a table is created, a dedicated <strong>Hisaab Group</strong> is automatically linked—and every round creates an official expense owed to the round winner!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <HandRankingGuide />
            <CreateTableModal groups={groups} />
          </div>
        </div>
      </div>

      {/* How It Works 3-Step Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0">
            1
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Sit on the 3D Table</div>
            <p className="text-xs text-slate-500 mt-0.5">
              Create a table or pick an open seat. A linked Hisaab group is generated automatically for all seated players.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
            2
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Play Blind, Chaal & Show</div>
            <p className="text-xs text-slate-500 mt-0.5">
              Experience 3D cards, chip stacks, Blind/Seen betting, Sideshow, and Showdown in real time.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
            3
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Auto-Recorded Expense</div>
            <p className="text-xs text-slate-500 mt-0.5">
              When a round ends, an expense is created in the group so losing players owe their pot bets to the winner!
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className={filter === 'active' ? 'bg-slate-900 text-white' : ''}
          >
            Active Tables ({tables.filter((t) => t.status !== 'finished').length})
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter === 'all' ? 'bg-slate-900 text-white' : ''}
          >
            All Tables ({tables.length})
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="py-14 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No TeenPatti tables open yet
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mt-1 mb-5">
              Start a new 3D TeenPatti table board. It will automatically generate a group and track every round&apos;s winnings as Hisaab expenses!
            </p>
            <CreateTableModal groups={groups} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTables.map((table) => {
            const isSeated = table.players.some(
              (p) => p.user_id === currentUserId
            );
            const statusBadge =
              table.status === 'playing'
                ? { label: 'In Game', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' }
                : table.status === 'waiting'
                ? { label: 'Open Seating', cls: 'bg-amber-100 text-amber-800 border-amber-200' }
                : { label: 'Finished', cls: 'bg-slate-100 text-slate-600 border-slate-200' };

            return (
              <Card
                key={table.id}
                className="group overflow-hidden border-slate-200/90 hover:border-emerald-500/60 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Mini Emerald Felt Banner */}
                  <div className="h-20 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-4 flex items-start justify-between text-white">
                    <div>
                      <h3 className="font-extrabold text-base truncate max-w-[200px]">
                        {table.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-emerald-200 mt-0.5">
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[180px]">
                          {table.group?.name || 'Linked Group'}
                        </span>
                      </div>
                    </div>
                    <Badge className={`text-[10px] font-bold border ${statusBadge.cls}`}>
                      {statusBadge.label}
                    </Badge>
                  </div>

                  <CardContent className="p-4 space-y-4">
                    {/* Stakes & Seats Row */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-500 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400">Boot / Min Bet</div>
                          <div className="font-bold text-slate-900">
                            ₹{Number(table.min_bet).toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-slate-400">Seated Players</div>
                          <div className="font-bold text-slate-900">
                            {table.players.length} / {table.max_players} Seats
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Seated Player Avatars */}
                    <div>
                      <div className="text-[11px] font-medium text-slate-400 mb-1.5">
                        Players at Table:
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {table.players.map((p) => (
                          <div
                            key={p.id}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-700"
                          >
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={p.user?.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[9px] bg-emerald-600 text-white">
                                {(p.user?.name || 'P')[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[90px]">
                              {p.user_id === currentUserId
                                ? 'You'
                                : p.user?.name?.split(' ')[0]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0 flex items-center gap-2">
                  <Link href={`/groups/${table.group_id}`} className="shrink-0">
                    <Button variant="outline" size="sm" title="View Group Expenses">
                      <Receipt className="w-4 h-4 text-slate-600" />
                    </Button>
                  </Link>
                  <Link href={`/gaming/tables/${table.id}`} className="flex-1">
                    <Button className="w-full bg-slate-900 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm">
                      {isSeated ? 'Return to 3D Table' : 'Sit & Play 3D Table'}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

