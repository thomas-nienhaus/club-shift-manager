import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { CalendarDays, Users, LogOut, Menu, X, ShieldAlert, Calendar, Clock, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, isAdmin, volunteerId } = useAuth();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    queryClient.clear();
    window.location.href = `${import.meta.env.BASE_URL}login`;
  };

  const navItems = [
    { href: '/', label: 'Planning', icon: CalendarDays, show: true },
    { href: '/seasons', label: 'Seizoenen', icon: Calendar, show: isAdmin },
    { href: '/volunteers', label: 'Vrijwilligers', icon: Users, show: isAdmin },
    { href: '/availability-slots', label: 'Dagdelen', icon: Clock, show: isAdmin },
    { href: '/settings', label: 'Instellingen', icon: Settings, show: !!volunteerId },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground no-print sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center overflow-hidden shrink-0">
            <img src="https://dtohsihpvasoukshnmjl.supabase.co/storage/v1/object/public/public-assets/KCVO.png" alt="KCVO" className="w-7 h-7 object-contain" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">Kantine Planner</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 h-screen w-72 bg-sidebar text-sidebar-foreground flex flex-col transition-transform duration-300 z-40 no-print shadow-2xl md:shadow-none",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-lg">
            <img src="https://dtohsihpvasoukshnmjl.supabase.co/storage/v1/object/public/public-assets/KCVO.png" alt="KCVO" className="w-9 h-9 object-contain" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight">Kantine Planner</span>
        </div>

        <div className="p-6 flex flex-col gap-1 border-b border-white/10 bg-black/20 overflow-hidden">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Ingelogd als</div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="font-bold text-lg truncate min-w-0" title={user?.username}>{user?.username}</div>
            {isAdmin && <span title="Administrator"><ShieldAlert className="w-4 h-4 text-primary shrink-0" /></span>}
          </div>
          <div className="text-sm text-sidebar-foreground/70 capitalize">{user?.role}</div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.filter(item => item.show).map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-sidebar-foreground/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-sidebar-foreground/50")} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-bold text-sidebar-foreground/70 hover:bg-destructive/20 hover:text-destructive transition-all"
          >
            <LogOut className="w-5 h-5" />
            Uitloggen
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden no-print"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
