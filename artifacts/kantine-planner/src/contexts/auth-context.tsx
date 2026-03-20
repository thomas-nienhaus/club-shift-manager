import React, { createContext, useContext, useEffect } from 'react';
import { useGetMe, type CurrentUser } from '@workspace/api-client-react';
import { useLocation } from 'wouter';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: CurrentUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  volunteerId: number | null;
  volunteerName: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useGetMe({
    query: {
      retry: false,
      refetchOnWindowFocus: false,
    }
  });

  const value = {
    user: user || null,
    isLoading,
    isAdmin: user?.role === 'admin',
    isAuthenticated: !!user && !error,
    volunteerId: user?.volunteerId ?? null,
    volunteerName: user?.volunteerName ?? null,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthGuard({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation('/login');
      } else if (requireAdmin && !isAdmin) {
        setLocation('/');
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, requireAdmin, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || (requireAdmin && !isAdmin)) {
    return null; // Will redirect via useEffect
  }

  return <>{children}</>;
}
