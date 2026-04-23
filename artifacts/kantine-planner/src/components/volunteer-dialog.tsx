import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/modal';
import {
  useCreateVolunteer,
  useUpdateVolunteer,
  useListVolunteers,
} from '@/hooks/use-volunteers';
import type { Volunteer } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Users, Info, ShieldAlert } from 'lucide-react';
import { useSlots } from '@/hooks/use-slots';
import { supabase } from '@/lib/supabase';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [availability, setAvailability] = useState<string[]>([]);
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

  const toggleSlot = (slotKey: string) => {
    setAvailability(prev =>
      prev.includes(slotKey) ? prev.filter(s => s !== slotKey) : [...prev, slotKey]
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
      availability,
      groupMemberIds,
    };

    if (editVolunteer) {
      updateVol({ id: editVolunteer.id, data: payload }, {
        onSuccess: async () => {
          queryClient.invalidateQueries({ queryKey: ['volunteers'] });

          if (email && !editVolunteer.hasPassword) {
            const { error } = await supabase.functions.invoke('invite-volunteer', {
              body: { email, volunteerId: editVolunteer.id },
            });
            if (error) {
              let message = error.message;
              try {
                const text = await (error as any).context.text();
                const body = JSON.parse(text);
                if (body?.error) message = body.error;
              } catch {}
              toast({ title: "Opgeslagen, maar uitnodiging mislukt", description: message, variant: "destructive" });
            } else {
              toast({ title: "Bijgewerkt", description: `Uitnodiging verstuurd naar ${email}.` });
            }
          } else {
            toast({ title: "Bijgewerkt", description: "Vrijwilliger is opgeslagen." });
          }

          onClose();
        },
        onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" })
      });
    } else {
      createVol({ data: payload }, {
        onSuccess: async (vol) => {
          queryClient.invalidateQueries({ queryKey: ['volunteers'] });

          if (email) {
            const { error } = await supabase.functions.invoke('invite-volunteer', {
              body: { email, volunteerId: vol.id },
            });
            if (error) {
              let message = error.message;
              try {
                const text = await (error as any).context.text();
                const body = JSON.parse(text);
                if (body?.error) message = body.error;
              } catch {}
              toast({ title: "Aangemaakt, maar uitnodiging mislukt", description: message, variant: "destructive" });
            } else {
              toast({ title: "Aangemaakt", description: `Uitnodiging verstuurd naar ${email}.` });
            }
          } else {
            toast({ title: "Aangemaakt", description: "Nieuwe vrijwilliger is toegevoegd." });
          }

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
          <div className="flex items-start gap-2 mt-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
            <span>
              {editVolunteer?.hasPassword
                ? 'Vrijwilliger heeft al een account. E-mailadres wijzigen stuurt geen nieuwe uitnodiging.'
                : 'Bij opslaan ontvangt de vrijwilliger automatisch een uitnodigingsmail om een wachtwoord in te stellen.'}
            </span>
          </div>
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
