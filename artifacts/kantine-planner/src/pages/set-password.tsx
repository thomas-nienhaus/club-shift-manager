import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirm) {
      toast({ title: 'Wachtwoorden komen niet overeen', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Wachtwoord moet minimaal 6 tekens zijn', variant: 'destructive' });
      return;
    }

    setIsPending(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsPending(false);

    if (error) {
      toast({ title: 'Fout', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Wachtwoord ingesteld', description: 'Je kunt nu inloggen met je nieuwe wachtwoord.' });
      setLocation('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-extrabold">Wachtwoord instellen</h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Kies een wachtwoord om je account te beveiligen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Nieuw wachtwoord
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field pr-12"
                placeholder="Minimaal 6 tekens"
                required
                autoFocus
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="label-text flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> Bevestig wachtwoord
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="input-field"
              placeholder="Herhaal wachtwoord"
              required
              autoComplete="new-password"
            />
            {confirm && password !== confirm && (
              <p className="text-xs text-destructive mt-1 font-medium">Wachtwoorden komen niet overeen.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-primary w-full mt-2"
          >
            {isPending ? 'Bezig...' : 'Wachtwoord opslaan'}
          </button>
        </form>
      </div>
    </div>
  );
}
