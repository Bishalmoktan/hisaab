import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserTables } from '@/lib/services/gaming';
import { getUserGroups } from '@/lib/services/groups';
import { GamingLandingClient } from '@/components/gaming/gaming-landing-client';

export const dynamic = 'force-dynamic';

export default async function GamingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const [tables, groups] = await Promise.all([
    getUserTables(),
    getUserGroups(),
  ]);

  return (
    <GamingLandingClient
      tables={tables}
      groups={groups}
      currentUserId={user.id}
    />
  );
}

