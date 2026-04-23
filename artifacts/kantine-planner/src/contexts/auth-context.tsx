import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';
import type { CurrentUser } from '@/lib/types';

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  volunteerId: number | null;
  volunteerName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadCurrentUser(authId: string, email: string): Promise<CurrentUser> {
  const { data } = await supabase
    .from('volunteers')
    .select('id, name, is_admin')
    .eq('auth_id', authId)
    .maybeSingle();

  return {
    role: data?.is_admin ? 'admin' : 'volunteer',
    username: email,
    volunteerId: data?.id ?? null,
    volunteerName: data?.name ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadCurrentUser(session.user.id, session.user.email!).then(u => {
          setUser(u);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadCurrentUser(session.user.id, session.user.email!).then(setUser);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAdmin: user?.role === 'admin',
    isAuthenticated: user !== null,
    volunteerId: user?.volunteerId ?? null,
    volunteerName: user?.volunteerName ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

export function AuthGuard({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) setLocation('/login');
      else if (requireAdmin && !isAdmin) setLocation('/');
    }
  }, [isLoading, isAuthenticated, isAdmin, requireAdmin, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || (requireAdmin && !isAdmin)) return null;

  return <>{children}</>;
}
