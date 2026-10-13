'use client';

import React from 'react';
import Link from 'next/link';
import type { GameAction, GamePlayer } from '@/lib/game/types';
import type { User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Trophy, ExternalLink, Receipt } from 'lucide-react';

interface GameLogProps {
  actions: (GameAction & { user: User })[];
  players: (GamePlayer & { user: User })[];
  groupId: string;
  groupName: string;
  latestExpenseId?: string | null;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  boot: { label: 'Boot Ante', color: 'bg-slate-100 text-slate-700' },
  bet: { label: 'Chaal / Blind', color: 'bg-emerald-100 text-emerald-800' },
  raise: { label: 'Raised 2x', color: 'bg-blue-100 text-blue-800' },
  call: { label: 'Called', color: 'bg-emerald-100 text-emerald-800' },
  fold: { label: 'Packed', color: 'bg-rose-100 text-rose-800' },
  pack: { label: 'Packed', color: 'bg-rose-100 text-rose-800' },
  sideshow: { label: 'Sideshow', color: 'bg-purple-100 text-purple-800' },
  show: { label: 'Showdown!', color: 'bg-amber-100 text-amber-800' },
};

export function GameLog({
  actions,
  players,
  groupId,
  groupName,
  latestExpenseId,
}: GameLogProps) {
  const sortedByChips = [...players].sort(
    (a, b) => Number(b.chip_balance) - Number(a.chip_balance)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Table Board & Group Expense Integration Card */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Table Board & Chip Standings
            </CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Each round automatically records an expense in{' '}
              <Link
                href={`/groups/${groupId}`}
                className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-0.5"
              >
                {groupName}
                <ExternalLink className="w-3 h-3" />
              </Link>
            </p>
          </div>
          {latestExpenseId && (
            <Link
              href={`/expenses/${latestExpenseId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200 transition"
            >
              <Receipt className="w-3.5 h-3.5" />
              View Last Round Expense
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedByChips.map((p, idx) => {
              const netChange = Number(p.chip_balance) - 1000;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-xs font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {p.user?.name || 'Player'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Seat #{p.seat_number}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-900">
                      ₹{Number(p.chip_balance).toLocaleString('en-IN')}
                    </div>
                    <div
                      className={`text-[11px] font-semibold ${
                        netChange > 0
                          ? 'text-emerald-600'
                          : netChange < 0
                          ? 'text-rose-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {netChange > 0 ? `+₹${netChange}` : netChange < 0 ? `-₹${Math.abs(netChange)}` : 'Even'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Live Round Action Feed */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600" />
            Live Round Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[210px] pr-3">
            {actions.length === 0 ? (
              <div className="h-36 flex items-center justify-center text-xs text-slate-400">
                No actions yet. Start a round to begin dealing cards!
              </div>
            ) : (
              <div className="space-y-2">
                {[...actions].reverse().map((act) => {
                  const cfg = ACTION_LABELS[act.action_type] ?? {
                    label: act.action_type,
                    color: 'bg-slate-100 text-slate-700',
                  };
                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/80 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {act.user?.name?.split(' ')[0] || 'Player'}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-semibold ${cfg.color}`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                      {Number(act.amount) > 0 && (
                        <span className="font-bold text-slate-900">
                          ₹{Number(act.amount).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

