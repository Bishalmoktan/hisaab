import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGameState, getAvailableUsersForTable } from '@/lib/services/gaming';
import { GameRoomClient } from '@/components/gaming/game-room-client';

export const dynamic = 'force-dynamic';

interface TablePageProps {
  params: {
    id: string;
  };
}

export default async function TableGameRoomPage({ params }: TablePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [gameState, availableUsers] = await Promise.all([
    getGameState(params.id),
    getAvailableUsersForTable(params.id),
  ]);

  if (!gameState) {
    notFound();
  }

  return (
    <GameRoomClient
      initialGameState={gameState}
      currentUserId={user.id}
      availableUsers={availableUsers}
    />
  );
}

