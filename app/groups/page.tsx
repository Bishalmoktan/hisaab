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
    <div className="p-3 sm:p-4 lg:p-8 space-y-4 sm:space-y-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900">Groups</h1>
          <p className="text-xs sm:text-sm lg:text-base text-slate-500 mt-0.5">Manage your expense sharing groups</p>
        </div>
        <div className="shrink-0">
          <CreateGroupModal />
        </div>
      </div>

      {groups.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-200 bg-transparent shadow-none">
          <CardContent className="p-6 sm:p-8 lg:p-16 text-center">
            <div className="w-12 sm:w-16 h-12 sm:h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <Users className="w-6 sm:w-8 h-6 sm:h-8 text-slate-400" />
            </div>
            <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-slate-700 mb-2">No groups yet</h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 max-w-xs mx-auto">
              Create a group to start splitting expenses with your friends, family, or colleagues
            </p>
            <CreateGroupModal />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
          {groups.map((group) => {
            const myRole = group.members.find((m) => m.user_id === user.id)?.role;
            return (
              <Link key={group.id} href={`/groups/${group.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white h-full">
                  <CardContent className="p-3 sm:p-4 lg:p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-2 sm:mb-3 lg:mb-4 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 sm:w-10 lg:w-12 h-8 sm:h-10 lg:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-xs sm:text-base lg:text-xl font-bold text-white shadow-sm shrink-0">
                          {group.name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-xs sm:text-sm lg:text-base text-slate-900 hover:text-blue-600 transition-colors truncate">
                            {group.name}
                          </h3>
                          {myRole === 'admin' && (
                            <Badge variant="secondary" className="text-xs mt-0.5 w-fit">Admin</Badge>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 hover:text-blue-400 transition-colors mt-0.5 shrink-0" />
                    </div>

                    {group.description && (
                      <p className="text-xs text-slate-500 mb-2 sm:mb-3 lg:mb-4 line-clamp-2">{group.description}</p>
                    )}

                    <div className="flex items-center justify-between text-xs mt-auto pt-2 sm:pt-3 lg:pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-1 min-w-0">
                        <div className="flex -space-x-2">
                          {group.members.slice(0, 4).map((m) => (
                            <Avatar key={m.id} className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white">
                              <AvatarImage src={m.user.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {m.user.name[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        <span className="text-slate-500 ml-1 truncate">
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400 shrink-0">
                        <Calendar className="w-3 h-3" />
                        <span className="whitespace-nowrap">{format(new Date(group.created_at), 'MMM yyyy')}</span>
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
