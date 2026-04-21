import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserGroups } from '@/lib/services/groups';
import { CreateGroupModal } from '@/components/groups/create-group-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Users, ArrowRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default async function GroupsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const groups = await getUserGroups();

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
          <p className="text-slate-500 mt-0.5">Manage your expense sharing groups</p>
        </div>
        <CreateGroupModal />
      </div>

      {groups.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 bg-transparent shadow-none">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No groups yet</h3>
            <p className="text-slate-400 mb-6 max-w-xs mx-auto">
              Create a group to start splitting expenses with your friends, family, or colleagues
            </p>
            <CreateGroupModal />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groups.map((group) => {
            const myRole = group.members.find((m) => m.user_id === user.id)?.role;
            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm">
                          {group.name[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {group.name}
                          </h3>
                          {myRole === 'admin' && (
                            <Badge variant="secondary" className="text-xs mt-0.5">Admin</Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors mt-1" />
                    </div>

                    {group.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{group.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className="flex -space-x-2">
                          {group.members.slice(0, 4).map((m) => (
                            <Avatar key={m.id} className="w-6 h-6 border-2 border-white">
                              <AvatarImage src={m.user.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {m.user.name[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-xs text-slate-500 ml-2">
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(group.created_at), 'MMM yyyy')}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
