import React, { useState } from 'react';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';
import { Mail, Eye, EyeOff, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { mutate: login, isPending } = useLogin();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (isAuthenticated) setLocation('/');
  }, [isAuthenticated, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    login({ data: { email: email.trim(), ...(password ? { password } : {}) } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
        setLocation('/');
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? err?.message ?? 'Er is een fout opgetreden.';
        setError(msg);
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative bg-sidebar overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center z-0 opacity-40"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/stadium-bg.png)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-sidebar to-sidebar/50 z-0" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="glass-panel rounded-3xl p-8 sm:p-10 text-center">
          <div className="w-20 h-20 mx-auto bg-primary rounded-2xl flex items-center justify-center shadow-xl shadow-primary/30 mb-8 -mt-16 transform -rotate-3">
            <span className="font-display font-extrabold text-5xl text-white">K</span>
          </div>

          <h1 className="text-3xl font-display font-extrabold text-sidebar mb-2">Kantine Planner</h1>
          <p className="text-sidebar/70 mb-8">Log in om het rooster te bekijken.</p>

          <form onSubmit={handleSubmit} className="space-y-5 text-left">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-sm font-bold text-center">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-bold text-sidebar mb-2">E-mailadres</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-sidebar/40 w-5 h-5" />
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/50 border-2 border-sidebar/10 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-sidebar font-semibold"
                  placeholder="naam@voorbeeld.nl"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-sidebar mb-2">
                Wachtwoord <span className="text-sidebar/40 font-normal text-xs">(indien ingesteld)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-sidebar/40 w-5 h-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-white/50 border-2 border-sidebar/10 rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 outline-none transition-all text-sidebar font-semibold"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sidebar/40 hover:text-sidebar/70 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 rounded-xl font-bold text-lg bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-200 mt-4 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPending ? "Inloggen..." : "Inloggen"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
