import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard, useAuth } from '@/contexts/auth-context';
import { useGetVolunteer } from '@/hooks/use-volunteers';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { User, Mail, Phone, Lock, Eye, EyeOff, Save } from 'lucide-react';

export default function Settings() {
  const { user, volunteerName, volunteerId } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data: volunteer } = useGetVolunteer(volunteerId ?? 0, { query: { enabled: !!volunteerId } });

  const { mutate: updateProfile, isPending } = useMutation({
    mutationFn: async (data: { name: string; email: string | null; phone: string | null; password?: string }) => {
      if (data.email) {
        const { error } = await supabase.auth.updateUser({ email: data.email });
        if (error) throw new Error(error.message);
      }
      if (data.password) {
        const { error } = await supabase.auth.updateUser({ password: data.password });
        if (error) throw new Error(error.message);
      }
      if (volunteerId) {
        const { error } = await supabase
          .from('volunteers')
          .update({ name: data.name, phone: data.phone ?? null })
          .eq('id', volunteerId);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['volunteers'] });
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Opgeslagen', description: 'Je gegevens zijn bijgewerkt.' });
    },
    onError: (err: any) => {
      const msg = err?.message ?? 'Er is een fout opgetreden.';
      toast({ title: 'Fout', description: msg, variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (volunteer && !initialized) {
      setName(volunteer.name ?? '');
      setEmail(volunteer.email ?? '');
      setPhone(volunteer.phone ?? '');
      setInitialized(true);
    } else if (user && !initialized && !volunteerId) {
      setName(volunteerName ?? '');
      setEmail(user.username ?? '');
      setInitialized(true);
    }
  }, [volunteer, user, volunteerName, volunteerId, initialized]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: 'Wachtwoorden komen niet overeen', description: 'Controleer je nieuwe wachtwoord.', variant: 'destructive' });
      return;
    }

    updateProfile({
      name,
      email: email || null,
      phone: phone || null,
      ...(newPassword ? { password: newPassword } : {}),
    });
  };

  return (
    <AuthGuard>
      <AppLayout>
        <div className="max-w-lg">
          <h1 className="text-3xl font-display font-extrabold mb-1">Instellingen</h1>
          <p className="text-muted-foreground mb-8">Pas je eigen gegevens aan.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="label-text flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Naam
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="input-field"
                placeholder="Jan Jansen"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> E-mailadres
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field"
                placeholder="naam@voorbeeld.nl"
              />
              <p className="text-xs text-muted-foreground mt-1">Dit is ook je inlognaam.</p>
            </div>

            {/* Phone */}
            <div>
              <label className="label-text flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> Telefoonnummer
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="input-field"
                placeholder="06 12345678"
              />
            </div>

            {/* Password divider */}
            <div className="pt-2 border-t border-border">
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">
                Wachtwoord wijzigen
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="label-text flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" /> Nieuw wachtwoord
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="input-field pr-12"
                      placeholder="Laat leeg om ongewijzigd te laten"
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

                {newPassword && (
                  <div>
                    <label className="label-text flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Bevestig wachtwoord
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="input-field pr-12"
                        placeholder="Herhaal nieuw wachtwoord"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-destructive mt-1 font-medium">Wachtwoorden komen niet overeen.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isPending ? 'Bezig...' : 'Opslaan'}
              </button>
            </div>
          </form>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
