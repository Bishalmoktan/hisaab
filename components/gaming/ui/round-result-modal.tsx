'use client';

import React from 'react';
import Link from 'next/link';
import type { PlayerGameState } from '@/lib/game/types';
import { evaluateHand } from '@/lib/game/hand-evaluator';
import { suitToSymbol } from '@/lib/game/deck';
import { Button } from '@/components/ui/button';
import { Trophy, Receipt, Play, ExternalLink } from 'lucide-react';

interface RoundResultBannerProps {
  gameState: PlayerGameState;
  onNextRound: () => void;
  loadingNext: boolean;
}

export function RoundResultBanner({
  gameState,
  onNextRound,
  loadingNext,
}: RoundResultBannerProps) {
  const { currentRound, table, myPlayer } = gameState;

  if (!currentRound || currentRound.status !== 'completed' || !currentRound.winner_id) {
    return null;
  }

  const winnerPlayer = table.players.find(
    (p) => p.user_id === currentRound.winner_id
  );
  const winnerName = winnerPlayer?.user?.name || 'Winner';
  const winnerCards = winnerPlayer?.revealed_cards ?? null;
  const evalResult =
    winnerCards && winnerCards.length === 3 ? evaluateHand(winnerCards) : null;

  return (
    <div className="rounded-2xl bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-emerald-500/20 border-2 border-amber-400/60 p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950">
                Round #{currentRound.round_number} Winner
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                {winnerName} won ₹{Number(currentRound.pot_amount).toLocaleString('en-IN')}!
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-slate-600">
              {evalResult && (
                <span className="font-semibold text-amber-800">
                  Winning Hand: {evalResult.description}
                </span>
              )}
              {winnerCards && winnerCards.length === 3 && (
                <span className="inline-flex items-center gap-1 ml-1">
                  {winnerCards.map((c, idx) => {
                    const isRed = c.suit === 'hearts' || c.suit === 'diamonds';
                    return (
                      <span
                        key={idx}
                        className={`px-1.5 py-0.5 rounded bg-white border text-xs font-bold shadow-sm ${
                          isRed ? 'text-red-600 border-red-200' : 'text-slate-900 border-slate-200'
                        }`}
                      >
                        {c.rank}
                        {suitToSymbol(c.suit)}
                      </span>
                    );
                  })}
                </span>
              )}
              <span>• Expense automatically recorded in group!</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {currentRound.expense_id && (
            <Link href={`/expenses/${currentRound.expense_id}`}>
              <Button variant="outline" size="sm" className="bg-white border-amber-300 text-slate-800 hover:bg-amber-50">
                <Receipt className="w-4 h-4 mr-1.5 text-amber-600" />
                View Expense Split
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          )}
          {myPlayer && table.players.length >= 2 && (
            <Button
              size="sm"
              onClick={onNextRound}
              disabled={loadingNext}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              <Play className="w-4 h-4 mr-1.5" />
              Play Next Round
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

