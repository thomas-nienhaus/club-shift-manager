import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import {
  useCreateVolunteer,
  useUpdateVolunteer,
  useListVolunteers,
  type Volunteer,
  type ShiftSlot,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Users, Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react';
import { useSlots } from '@/hooks/use-slots';

const MAX_GROUP_SIZE = 5;

interface VolunteerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  editVolunteer?: Volunteer | null;
}

export function VolunteerDialog({ isOpen, onClose, editVolunteer }: VolunteerDialogProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [availability, setAvailability] = useState<ShiftSlot[]>([]);
  const [groupMemberIds, setGroupMemberIds] = useState<number[]>([]);

  const { slots: allSlots } = useSlots();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: createVol, isPending: isCreating } = useCreateVolunteer();
  const { mutate: updateVol, isPending: isUpdating } = useUpdateVolunteer();
  const { data: allVolunteers } = useListVolunteers();

  const otherVolunteers = (allVolunteers || []).filter(v => v.id !== editVolunteer?.id);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      if (editVolunteer) {
        setName(editVolunteer.name);
        setEmail(editVolunteer.email || '');
        setPhone(editVolunteer.phone || '');
        setIsAdmin(editVolunteer.isAdmin ?? false);
        setAvailability(editVolunteer.availability || []);
        setGroupMemberIds(editVolunteer.groupMembers?.map(m => m.id) || []);
      } else {
        setName('');
        setEmail('');
        setPhone('');
        setIsAdmin(false);
        setAvailability([]);
        setGroupMemberIds([]);
      }
    }
  }, [editVolunteer, isOpen]);

  const toggleSlot = (slot: ShiftSlot) => {
    setAvailability(prev =>
      prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]
    );
  };

  const toggleGroupMember = (id: number) => {
    setGroupMemberIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_GROUP_SIZE - 1) {
        toast({ title: "Maximaal bereikt", description: `Een groep mag maximaal ${MAX_GROUP_SIZE} vrijwilligers bevatten.`, variant: "destructive" });
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      isAdmin,
      ...(editVolunteer
        ? (password ? { password } : {})
        : { password: password || null }
      ),
      availability,
      groupMemberIds,
    };

    if (editVolunteer) {
      updateVol({ id: editVolunteer.id, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/volunteers'] });
          toast({ title: "Bijgewerkt", description: "Vrijwilliger is opgeslagen." });
          onClose();
        },
        onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" })
      });
    } else {
      createVol({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/volunteers'] });
          toast({ title: "Aangemaakt", description: "Nieuwe vrijwilliger is toegevoegd." });
          onClose();
        },
        onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" })
      });
    }
  };

  const isPending = isCreating || isUpdating;
  const spotsLeft = MAX_GROUP_SIZE - 1 - groupMemberIds.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editVolunteer ? "Vrijwilliger Bewerken" : "Nieuwe Vrijwilliger"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label-text">Volledige Naam</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="input-field"
            placeholder="Jan Jansen"
          />
        </div>

        <div>
          <label className="label-text">E-mailadres (optioneel)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="input-field"
            placeholder="jan@voorbeeld.nl"
          />
          <p className="text-xs text-muted-foreground mt-1">Vrijwilligers kunnen met dit e-mailadres inloggen op de planning.</p>
        </div>

        <div>
          <label className="label-text flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            {editVolunteer
              ? `Wachtwoord wijzigen${editVolunteer.hasPassword ? ' (momenteel ingesteld)' : ' (nog niet ingesteld)'}`
              : 'Wachtwoord (optioneel)'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input-field pr-12"
              placeholder={editVolunteer ? 'Laat leeg om ongewijzigd te laten' : 'Voer een wachtwoord in'}
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
          {editVolunteer && password && (
            <p className="text-xs text-primary mt-1 font-medium">Het wachtwoord wordt bijgewerkt bij opslaan.</p>
          )}
        </div>

        <div>
          <label className="label-text">Telefoonnummer (optioneel)</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="input-field"
            placeholder="06 12345678"
          />
        </div>

        <div>
          <label
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-all ${
              isAdmin
                ? 'border-primary bg-primary/10'
                : 'border-border bg-white hover:border-primary/30'
            }`}
          >
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={e => setIsAdmin(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <ShieldAlert className={`w-4 h-4 shrink-0 ${isAdmin ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <div className={`font-bold text-sm ${isAdmin ? 'text-primary' : 'text-foreground'}`}>
                Beheerdersrechten
              </div>
              <div className="text-xs text-muted-foreground">
                Kan diensten en vrijwilligers beheren
              </div>
            </div>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text mb-0">Beschikbaarheid</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setAvailability(allSlots.map(s => s.key))} className="text-xs text-primary font-semibold hover:underline">
                Alles
              </button>
              <span className="text-muted-foreground text-xs">·</span>
              <button type="button" onClick={() => setAvailability([])} className="text-xs text-muted-foreground font-semibold hover:underline">
                Wissen
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {allSlots.map(slot => {
              const checked = availability.includes(slot.key);
              return (
                <button
                  key={slot.key}
                  type="button"
                  onClick={() => toggleSlot(slot.key)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 text-left transition-all ${
                    checked
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-white text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  {slot.label}
                </button>
              );
            })}
          </div>
          {availability.length === 0 && (
            <p className="text-xs text-amber-600 mt-1.5 font-medium">
              Geen beschikbaarheid geselecteerd — vrijwilliger is niet indeelbaar.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-text mb-0 flex items-center gap-1.5">
              <Users className="w-4 h-4" /> Groep (optioneel)
            </label>
            <span className="text-xs text-muted-foreground font-medium">
              {groupMemberIds.length > 0
                ? `${groupMemberIds.length + 1} van ${MAX_GROUP_SIZE} leden`
                : `max. ${MAX_GROUP_SIZE} vrijwilligers`}
            </span>
          </div>

          {otherVolunteers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Geen andere vrijwilligers beschikbaar.</p>
          ) : (
            <div className="max-h-48 overflow-y-auto rounded-xl border-2 border-border divide-y divide-border">
              {otherVolunteers.map(v => {
                const checked = groupMemberIds.includes(v.id);
                const disabled = !checked && spotsLeft === 0;
                return (
                  <label
                    key={v.id}
                    className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed pointer-events-none'
                        : checked
                          ? 'bg-primary/5 cursor-pointer'
                          : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      aria-disabled={disabled}
                      onChange={() => toggleGroupMember(v.id)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm font-medium text-foreground">{v.name}</span>
                    {v.groupId && v.groupId === editVolunteer?.groupId && (
                      <span className="ml-auto text-xs text-primary font-semibold">huidige groep</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}

          {groupMemberIds.length > 0 && (
            <p className="text-xs text-primary mt-1.5 font-medium">
              Deze vrijwilligers worden altijd samen ingepland.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>
            Annuleren
          </button>
          <button type="submit" className="btn-primary" disabled={isPending}>
            {isPending ? "Bezig..." : "Opslaan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
