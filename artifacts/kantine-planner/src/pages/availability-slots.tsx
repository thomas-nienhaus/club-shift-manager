import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/contexts/auth-context';
import {
  useListAvailabilitySlots,
  useCreateAvailabilitySlot,
  useUpdateAvailabilitySlot,
  useDeleteAvailabilitySlot,
} from '@/hooks/use-availability-slots';
import type { AvailabilitySlot } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, GripVertical, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

import { DAYS, DAY_LABELS, getDayFromKey, makeLabelSlug } from '@/utils/slot-utils';

interface SlotFormState {
  day: string;
  label: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

function SlotFormModal({
  isOpen,
  onClose,
  editSlot,
}: {
  isOpen: boolean;
  onClose: () => void;
  editSlot?: AvailabilitySlot | null;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: createSlot, isPending: isCreating } = useCreateAvailabilitySlot();
  const { mutate: updateSlot, isPending: isUpdating } = useUpdateAvailabilitySlot();

  const [form, setForm] = useState<SlotFormState>({ day: 'monday', label: '', isActive: true, startTime: '', endTime: '' });

  React.useEffect(() => {
    if (isOpen) {
      if (editSlot) {
        setForm({
          day: getDayFromKey(editSlot.key),
          label: editSlot.label,
          isActive: editSlot.isActive ?? true,
          startTime: editSlot.startTime ?? '',
          endTime: editSlot.endTime ?? '',
        });
      } else {
        setForm({ day: 'monday', label: '', isActive: true, startTime: '', endTime: '' });
      }
    }
  }, [isOpen, editSlot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
    };
    const times = {
      startTime: form.startTime || null,
      endTime: form.endTime || null,
    };
    if (editSlot) {
      updateSlot({ id: editSlot.id, data: { label: form.label, isActive: form.isActive, ...times } }, {
        onSuccess: () => { invalidate(); toast({ title: 'Opgeslagen', description: 'Dagdeel bijgewerkt.' }); onClose(); },
        onError: (e: any) => toast({ title: 'Fout', description: e.message, variant: 'destructive' }),
      });
    } else {
      const key = `${form.day}_${makeLabelSlug(form.label)}`;
      createSlot({ data: { key, label: form.label, isActive: form.isActive, ...times } }, {
        onSuccess: () => { invalidate(); toast({ title: 'Aangemaakt', description: 'Nieuw dagdeel toegevoegd.' }); onClose(); },
        onError: (e: any) => toast({ title: 'Fout', description: e.message, variant: 'destructive' }),
      });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editSlot ? 'Dagdeel Bewerken' : 'Nieuw Dagdeel'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!editSlot ? (
          <div>
            <label className="label-text">Dag</label>
            <select
              required
              value={form.day}
              onChange={e => setForm(f => ({ ...f, day: e.target.value }))}
              className="input-field"
            >
              {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="label-text">Dag</label>
            <p className="input-field text-muted-foreground bg-muted/40 cursor-default">
              {DAY_LABELS[getDayFromKey(editSlot.key)] ?? getDayFromKey(editSlot.key)}
            </p>
          </div>
        )}
        <div>
          <label className="label-text">Label (weergavenaam)</label>
          <input
            type="text"
            required
            value={form.label}
            onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
            className="input-field"
            placeholder="bijv. Vrijdagavond"
          />
        </div>
        <div>
          <label className="label-text">Tijdsduur (optioneel)</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Begintijd</label>
              <input
                type="time"
                value={form.startTime}
                onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="input-field"
              />
            </div>
            <span className="text-muted-foreground font-bold mt-5">–</span>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground font-medium mb-1 block">Eindtijd</label>
              <input
                type="time"
                value={form.endTime}
                onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            className="w-4 h-4 accent-primary"
          />
          <label htmlFor="isActive" className="text-sm font-semibold text-foreground cursor-pointer">
            Actief (zichtbaar in planning en beschikbaarheid)
          </label>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>Annuleren</button>
          <button type="submit" className="btn-primary" disabled={isPending}>{isPending ? 'Bezig...' : 'Opslaan'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function AvailabilitySlotsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<AvailabilitySlot | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: slots, isLoading } = useListAvailabilitySlots();
  const { mutate: deleteSlot, isPending: isDeleting } = useDeleteAvailabilitySlot();
  const { mutate: updateSlot } = useUpdateAvailabilitySlot();

  const handleDelete = (slot: AvailabilitySlot) => {
    if (window.confirm(`Weet je zeker dat je het dagdeel "${slot.label}" wilt verwijderen? Bestaande diensten met dit dagdeel blijven bestaan.`)) {
      deleteSlot({ id: slot.id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
          toast({ title: 'Verwijderd', description: `${slot.label} is verwijderd.` });
        },
        onError: (e: any) => toast({ title: 'Fout', description: e.message, variant: 'destructive' }),
      });
    }
  };

  const toggleActive = (slot: AvailabilitySlot) => {
    updateSlot({ id: slot.id, data: { isActive: !slot.isActive } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['availability-slots'] }),
      onError: (e: any) => toast({ title: 'Fout', description: e.message, variant: 'destructive' }),
    });
  };

  const sorted = (slots ?? []).slice().sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const ActiveBadge = ({ slot }: { slot: AvailabilitySlot }) => (
    <button
      onClick={() => toggleActive(slot)}
      title={slot.isActive ? 'Actief — klik om te deactiveren' : 'Inactief — klik om te activeren'}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
        slot.isActive
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {slot.isActive ? <><Check className="w-3 h-3" /> Actief</> : <><X className="w-3 h-3" /> Inactief</>}
    </button>
  );

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Dagdelen</h1>
            <p className="text-muted-foreground text-lg">Beheer de beschikbare dagdelen voor diensten en beschikbaarheid.</p>
          </div>
          <button
            onClick={() => { setEditSlot(null); setIsModalOpen(true); }}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            <Plus className="w-5 h-5" /> Nieuw Dagdeel
          </button>
        </div>

        <div className="bg-white rounded-2xl border-2 border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground font-bold animate-pulse">Laden...</div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Geen dagdelen geconfigureerd.</div>
          ) : (
            <>
              {/* ── Desktop table (md+) ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b border-border">
                      <th className="p-4 pl-6 w-8"></th>
                      <th className="p-4">Label</th>
                      <th className="p-4">Dag</th>
                      <th className="p-4">Sleutel</th>
                      <th className="p-4">Tijd</th>
                      <th className="p-4 text-center">Actief</th>
                      <th className="p-4 text-right pr-6">Acties</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sorted.map((slot) => (
                      <tr key={slot.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="p-4 pl-6 text-muted-foreground">
                          <GripVertical className="w-4 h-4 opacity-40" />
                        </td>
                        <td className="p-4 font-bold text-foreground">{slot.label}</td>
                        <td className="p-4 text-sm text-muted-foreground">{DAY_LABELS[getDayFromKey(slot.key)] ?? '—'}</td>
                        <td className="p-4 font-mono text-sm text-muted-foreground">{slot.key}</td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {slot.startTime && slot.endTime
                            ? <span className="font-medium text-foreground">{slot.startTime} – {slot.endTime}</span>
                            : slot.startTime
                              ? <span className="font-medium text-foreground">vanaf {slot.startTime}</span>
                              : <span>—</span>
                          }
                        </td>
                        <td className="p-4 text-center">
                          <ActiveBadge slot={slot} />
                        </td>
                        <td className="p-4 pr-6 text-right space-x-2">
                          <button
                            onClick={() => { setEditSlot(slot); setIsModalOpen(true); }}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Bewerken"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(slot)}
                            disabled={isDeleting}
                            className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Verwijderen"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile cards (< md) ── */}
              <div className="md:hidden divide-y divide-border">
                {sorted.map((slot) => (
                  <div key={slot.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="w-4 h-4 text-muted-foreground opacity-40 shrink-0" />
                        <span className="font-bold text-foreground">{slot.label}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setEditSlot(slot); setIsModalOpen(true); }}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(slot)}
                          disabled={isDeleting}
                          className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pl-6">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs text-muted-foreground">{DAY_LABELS[getDayFromKey(slot.key)] ?? '—'}</span>
                        <span className="font-mono text-xs text-muted-foreground">{slot.key}</span>
                        {(slot.startTime || slot.endTime) && (
                          <span className="text-xs font-medium text-foreground">
                            {slot.startTime && slot.endTime
                              ? `${slot.startTime} – ${slot.endTime}`
                              : slot.startTime
                                ? `vanaf ${slot.startTime}`
                                : ''}
                          </span>
                        )}
                      </div>
                      <ActiveBadge slot={slot} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <SlotFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editSlot={editSlot}
        />
      </AppLayout>
    </AuthGuard>
  );
}
