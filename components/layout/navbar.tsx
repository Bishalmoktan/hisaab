'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  LogOut,
  DollarSign,
  Menu,
  X,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/groups', label: 'Groups', icon: Users },
];

interface NavbarProps {
  user: User;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 min-h-screen bg-white border-r border-border shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-base">Hisaab</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-blue-600' : 'text-slate-400')} />
                {label}
                {active && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500 truncate">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Hisaab</span>
          </Link>
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar_url ?? undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="h-9 w-9"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="border-t border-border bg-white px-4 py-3 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
                    active ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 w-full"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        )}
      </header>
    </>
  );
}
