'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows } from '@react-three/drei';
import type { PlayerGameState } from '@/lib/game/types';
import { PokerTable } from './poker-table';
import { ChipStack } from './chip-stack';
import { PlayerSeat } from './player-seat';
import { Coins, Sparkles } from 'lucide-react';

interface GameSceneProps {
  gameState: PlayerGameState;
  currentUserId: string;
  onSitAtSeat: (seatNumber: number) => void;
  onSeeCards: () => void;
}

export function GameScene({
  gameState,
  currentUserId,
  onSitAtSeat,
  onSeeCards,
}: GameSceneProps) {
  const { table, currentRound, myCards, myPlayer } = gameState;
  const maxSeats = table.max_players || 5;
  const potAmount = Number(currentRound?.pot_amount ?? 0);
  const roundInProgress = Boolean(
    currentRound &&
      (currentRound.status === 'betting' ||
        currentRound.status === 'showdown' ||
        currentRound.status === 'completed')
  );

  // Build seat map (1..maxSeats)
  const seatMap = new Map(table.players.map((p) => [p.seat_number, p]));

  return (
    <div className="relative w-full h-[460px] sm:h-[540px] lg:h-[600px] rounded-2xl overflow-hidden bg-gradient-to-b from-slate-950 via-emerald-950/40 to-slate-950 border border-slate-800 shadow-2xl">
      {/* Subtle top-left camera hint */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/75 border border-slate-700/70 text-[11px] text-slate-300 backdrop-blur-sm">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span>Drag to rotate 3D table • Scroll to zoom</span>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 6.2, 6.8], fov: 44 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#060d18']} />
        <fog attach="fog" args={['#060d18', 11, 22]} />

        {/* Casino Lighting Setup */}
        <ambientLight intensity={0.65} />
        <spotLight
          position={[0, 9.5, 1.5]}
          angle={0.65}
          penumbra={0.6}
          intensity={2.2}
          color="#fef3c7"
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-5, 4, -4]} intensity={0.6} color="#38bdf8" />
        <pointLight position={[5, 4, 4]} intensity={0.6} color="#fbbf24" />

        <Suspense fallback={null}>
          {/* 3D Oval Casino Table */}
          <PokerTable />

          {/* Central Pot Chip Stack */}
          {potAmount > 0 && (
            <group position={[0, 0.02, 0]}>
              <ChipStack
                amount={potAmount}
                position={[0, 0, 0]}
                scale={1.15}
                animateSpin={currentRound?.status === 'betting'}
              />

              {/* Floating Pot Amount Banner in Center of Table */}
              <Html position={[0, 0.85, 0]} center distanceFactor={9} zIndexRange={[5, 0]}>
                <div className="px-3.5 py-1.5 rounded-full bg-slate-950/90 border border-amber-400/70 shadow-xl flex items-center gap-1.5 whitespace-nowrap select-none">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-medium text-amber-200">POT:</span>
                  <span className="text-sm font-extrabold text-amber-400">
                    ₹{potAmount.toLocaleString('en-IN')}
                  </span>
                </div>
              </Html>
            </group>
          )}

          {/* Render All Seats around the Table */}
          {Array.from({ length: maxSeats }, (_, idx) => {
            const seatNumber = idx + 1;
            const seatedPlayer = seatMap.get(seatNumber) ?? null;
            const isCurrentUser = seatedPlayer?.user_id === currentUserId;
            const isTurn =
              Boolean(currentRound) &&
              currentRound?.status === 'betting' &&
              currentRound?.current_turn_user_id === seatedPlayer?.user_id;
            const isWinner =
              Boolean(currentRound) &&
              currentRound?.status === 'completed' &&
              currentRound?.winner_id === seatedPlayer?.user_id;

            return (
              <PlayerSeat
                key={seatNumber}
                seatNumber={seatNumber}
                totalSeats={maxSeats}
                player={seatedPlayer}
                isCurrentUser={isCurrentUser}
                isTurn={isTurn}
                isWinner={isWinner}
                roundInProgress={roundInProgress}
                myCards={isCurrentUser ? myCards : null}
                canSitHere={!myPlayer && table.status !== 'finished'}
                onSitHere={onSitAtSeat}
                onSeeCards={onSeeCards}
              />
            );
          })}

          <ContactShadows
            position={[0, -2.1, 0]}
            opacity={0.55}
            scale={15}
            blur={2.4}
            far={4.5}
          />
        </Suspense>

        <OrbitControls
          enablePan={false}
          minDistance={5.2}
          maxDistance={11.5}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.35}
          target={[0, 0, 0.3]}
        />
      </Canvas>
    </div>
  );
}

