import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/navbar';
import type { User } from '@/lib/types';

export default async function GroupsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  const user: User = profile ?? {
    id: authUser.id,
    name: authUser.user_metadata?.full_name ?? authUser.email?.split('@')[0] ?? 'User',
    email: authUser.email ?? '',
    avatar_url: authUser.user_metadata?.avatar_url ?? null,
    created_at: new Date().toISOString(),
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <Navbar user={user} />
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
