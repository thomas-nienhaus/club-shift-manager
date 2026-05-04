import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppLayout } from '@/components/layout/app-layout';
import { AuthGuard } from '@/contexts/auth-context';
import {
  useListAvailabilitySlots,
  useCreateAvailabilitySlot,
  useUpdateAvailabilitySlot,
  useDeleteAvailabilitySlot,
  useReorderAvailabilitySlots,
  useSetHomeGameSlot,
} from '@/hooks/use-availability-slots';
import type { AvailabilitySlot } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, GripVertical, Check, X, Home } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

import { DAYS, DAY_LABELS, getDayFromKey, makeLabelSlug } from '@/utils/slot-utils';

interface SlotFormState {
  day: string;
  label: string;
  isActive: boolean;
  isHomeGameSlot: boolean;
  startTime: string;
  endTime: string;
  homeStartTime: string;
  homeEndTime: string;
}

function SlotFormModal({
  isOpen,
  onClose,
  editSlot,
  currentSlotsLength,
}: {
  isOpen: boolean;
  onClose: () => void;
  editSlot?: AvailabilitySlot | null;
  currentSlotsLength: number;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate: createSlot, isPending: isCreating } = useCreateAvailabilitySlot();
  const { mutate: updateSlot, isPending: isUpdating } = useUpdateAvailabilitySlot();
  const { mutate: setHomeGameSlot, isPending: isSettingHomeGame } = useSetHomeGameSlot();

  const emptyForm: SlotFormState = { day: 'monday', label: '', isActive: true, isHomeGameSlot: false, startTime: '', endTime: '', homeStartTime: '', homeEndTime: '' };
  const [form, setForm] = useState<SlotFormState>(emptyForm);

  React.useEffect(() => {
    if (isOpen) {
      if (editSlot) {
        setForm({
          day: getDayFromKey(editSlot.key),
          label: editSlot.label,
          isActive: editSlot.isActive ?? true,
          isHomeGameSlot: editSlot.isHomeGameSlot ?? false,
          startTime: editSlot.startTime ? editSlot.startTime.slice(0, 5) : '',
          endTime: editSlot.endTime ? editSlot.endTime.slice(0, 5) : '',
          homeStartTime: editSlot.homeStartTime ? editSlot.homeStartTime.slice(0, 5) : '',
          homeEndTime: editSlot.homeEndTime ? editSlot.homeEndTime.slice(0, 5) : '',
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [isOpen, editSlot]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['availability-slots'] });
    const times = {
      startTime: form.startTime || null,
      endTime: form.endTime || null,
      homeStartTime: form.isHomeGameSlot ? null : (form.homeStartTime || null),
      homeEndTime: form.isHomeGameSlot ? null : (form.homeEndTime || null),
    };

    const applyHomeGameFlag = (id: number, cb: () => void) => {
      const changed = !editSlot || form.isHomeGameSlot !== editSlot.isHomeGameSlot;
      if (!changed) { cb(); return; }
      setHomeGameSlot(form.isHomeGameSlot ? id : null, { onSuccess: cb, onError: (err: any) => toast({ title: 'Fout', description: err.message, variant: 'destructive' }) });
    };

    if (editSlot) {
      updateSlot({ id: editSlot.id, data: { label: form.label, isActive: form.isActive, ...times } }, {
        onSuccess: () => applyHomeGameFlag(editSlot.id, () => { invalidate(); toast({ title: 'Opgeslagen', description: 'Dienst bijgewerkt.' }); onClose(); }),
        onError: (err: any) => toast({ title: 'Fout', description: err.message, variant: 'destructive' }),
      });
    } else {
      const key = `${form.day}_${makeLabelSlug(form.label)}`;
      createSlot({ data: { key, label: form.label, isActive: form.isActive, ...times, sortOrder: currentSlotsLength } }, {
        onSuccess: (data: any) => applyHomeGameFlag(data.id, () => { invalidate(); toast({ title: 'Aangemaakt', description: 'Nieuwe dienst toegevoegd.' }); onClose(); }),
        onError: (err: any) => toast({ title: 'Fout', description: err.message, variant: 'destructive' }),
      });
    }
  };

  const isPending = isCreating || isUpdating || isSettingHomeGame;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editSlot ? 'Dienst Bewerken' : 'Nieuwe Dienst'}>
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
        {form.isHomeGameSlot ? (
          <div>
            <label className="label-text">Tijden (optioneel)</label>
            <p className="text-xs text-muted-foreground mb-2">Deze dienst is alleen actief op thuiswedstrijddagen.</p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Begintijd</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                  className="input-field"
                />
              </div>
              <span className="text-muted-foreground font-bold sm:mt-5 hidden sm:inline">–</span>
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
        ) : (
          <>
            <div>
              <label className="label-text">Uitwedstrijd tijden (optioneel)</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Begintijd</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <span className="text-muted-foreground font-bold sm:mt-5 hidden sm:inline">–</span>
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
            <div>
              <label className="label-text">Thuiswedstrijd tijden (optioneel)</label>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Begintijd</label>
                  <input
                    type="time"
                    value={form.homeStartTime}
                    onChange={e => setForm(f => ({ ...f, homeStartTime: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <span className="text-muted-foreground font-bold sm:mt-5 hidden sm:inline">–</span>
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Eindtijd</label>
                  <input
                    type="time"
                    value={form.homeEndTime}
                    onChange={e => setForm(f => ({ ...f, homeEndTime: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Worden gebruikt als de dienst op een thuiswedstrijddag valt.</p>
            </div>
          </>
        )}

        <div className="space-y-3">
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
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isHomeGameSlot"
              checked={form.isHomeGameSlot}
              onChange={e => setForm(f => ({ ...f, isHomeGameSlot: e.target.checked }))}
              className="w-4 h-4 accent-primary"
            />
            <label htmlFor="isHomeGameSlot" className="text-sm font-semibold text-foreground cursor-pointer">
              Extra dienst bij thuiswedstrijden
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>Annuleren</button>
          <button type="submit" className="btn-primary" disabled={isPending}>{isPending ? 'Bezig...' : 'Opslaan'}</button>
        </div>
      </form>
    </Modal>
  );
}

function HomeGameBadge({ slot, onToggle }: { slot: AvailabilitySlot; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={slot.isHomeGameSlot ? 'Thuiswedstrijd dienst — klik om te verwijderen' : 'Instellen als extra dienst bij thuiswedstrijden'}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${
        slot.isHomeGameSlot
          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      <Home className="w-3 h-3" />
      {slot.isHomeGameSlot ? 'Thuiswedstrijd' : '—'}
    </button>
  );
}

function ActiveBadge({ slot, onToggle }: { slot: AvailabilitySlot; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
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
}

function hm(t: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

function SlotTime({ slot }: { slot: AvailabilitySlot }) {
  const s = hm(slot.startTime), e = hm(slot.endTime);
  const hs = hm(slot.homeStartTime), he = hm(slot.homeEndTime);
  const away = s && e ? `${s} – ${e}` : s ? `vanaf ${s}` : null;
  const home = hs && he ? `${hs} – ${he}` : null;
  if (!away && !home) return <span>—</span>;
  if (away && home) return (
    <span className="flex flex-col gap-0.5 text-xs">
      <span className="font-medium text-foreground">Uit: {away}</span>
      <span className="font-medium text-blue-700">Thuis: {home}</span>
    </span>
  );
  return <span className="font-medium text-foreground">{away ?? home}</span>;
}

function SortableRow({
  slot,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleHomeGame,
  isDeleting,
}: {
  slot: AvailabilitySlot;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleHomeGame: () => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-muted/20 transition-colors group">
      <td className="p-4 pl-6 text-muted-foreground cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
        <GripVertical className="w-4 h-4 opacity-40" />
      </td>
      <td className="p-4 font-bold text-foreground">{slot.label}</td>
      <td className="p-4 text-sm text-muted-foreground">{DAY_LABELS[getDayFromKey(slot.key)] ?? '—'}</td>
      <td className="p-4 text-sm text-muted-foreground">
        <SlotTime slot={slot} />
      </td>
      <td className="p-4 text-center">
        <ActiveBadge slot={slot} onToggle={onToggleActive} />
      </td>
      <td className="p-4 text-center">
        <HomeGameBadge slot={slot} onToggle={onToggleHomeGame} />
      </td>
      <td className="p-4 pr-6 text-right space-x-2">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Bewerken"
        >
          <Edit2 className="w-5 h-5" />
        </button>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
          title="Verwijderen"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </td>
    </tr>
  );
}

function SortableCard({
  slot,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleHomeGame,
  isDeleting,
}: {
  slot: AvailabilitySlot;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleHomeGame: () => void;
  isDeleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="cursor-grab active:cursor-grabbing touch-none" {...attributes} {...listeners}>
            <GripVertical className="w-4 h-4 text-muted-foreground opacity-40 shrink-0" />
          </span>
          <span className="font-bold text-foreground">{slot.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            className="p-2.5 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pl-6">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-muted-foreground">{DAY_LABELS[getDayFromKey(slot.key)] ?? '—'}</span>
          {(slot.startTime || slot.homeStartTime) && (
            <span className="flex flex-col gap-0.5">
              {slot.startTime && (
                <span className="text-xs font-medium text-foreground">
                  {slot.endTime ? `Uit: ${hm(slot.startTime)} – ${hm(slot.endTime)}` : `vanaf ${hm(slot.startTime)}`}
                </span>
              )}
              {slot.homeStartTime && slot.homeEndTime && (
                <span className="text-xs font-medium text-blue-700">Thuis: {hm(slot.homeStartTime)} – {hm(slot.homeEndTime)}</span>
              )}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <HomeGameBadge slot={slot} onToggle={onToggleHomeGame} />
          <ActiveBadge slot={slot} onToggle={onToggleActive} />
        </div>
      </div>
    </div>
  );
}

export default function AvailabilitySlotsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState<AvailabilitySlot | null>(null);
  const [localOrder, setLocalOrder] = useState<AvailabilitySlot[]>([]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: slots, isLoading } = useListAvailabilitySlots();
  const { mutate: deleteSlot, isPending: isDeleting } = useDeleteAvailabilitySlot();
  const { mutate: updateSlot } = useUpdateAvailabilitySlot();
  const { mutate: reorderSlots } = useReorderAvailabilitySlots();
  const { mutate: setHomeGameSlot } = useSetHomeGameSlot();

  React.useEffect(() => {
    if (slots) setLocalOrder([...slots].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
  }, [slots]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalOrder(prev => {
      const oldIndex = prev.findIndex(s => s.id === active.id);
      const newIndex = prev.findIndex(s => s.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      reorderSlots(next.map((s, i) => ({ id: s.id, sortOrder: i })));
      return next;
    });
  };

  const handleDelete = (slot: AvailabilitySlot) => {
    if (window.confirm(`Weet je zeker dat je het dienst "${slot.label}" wilt verwijderen? Bestaande diensten met dit dienst blijven bestaan.`)) {
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

  const toggleHomeGame = (slot: AvailabilitySlot) => {
    const nextId = slot.isHomeGameSlot ? null : slot.id;
    setHomeGameSlot(nextId, {
      onSuccess: () => toast({
        title: nextId ? 'Ingesteld' : 'Verwijderd',
        description: nextId
          ? `"${slot.label}" is het extra dienst bij thuiswedstrijden.`
          : `Thuiswedstrijd dienst verwijderd.`,
      }),
      onError: (e: any) => toast({ title: 'Fout', description: e.message, variant: 'destructive' }),
    });
  };

  return (
    <AuthGuard requireAdmin>
      <AppLayout>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-display font-extrabold mb-2">Diensten</h1>
            <p className="text-muted-foreground text-lg">Beheer de beschikbare diensten voor diensten en beschikbaarheid.</p>
          </div>
          <button
            onClick={() => { setEditSlot(null); setIsModalOpen(true); }}
            className="btn-primary flex items-center gap-2 shrink-0"
          >
            <Plus className="w-5 h-5" /> Nieuwe Dienst
          </button>
        </div>

        <div className="bg-white rounded-2xl border-2 border-border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground font-bold animate-pulse">Laden...</div>
          ) : localOrder.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">Geen diensten geconfigureerd.</div>
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
                      <th className="p-4">Tijd</th>
                      <th className="p-4 text-center">Actief</th>
                      <th className="p-4 text-center">Thuiswedstrijd</th>
                      <th className="p-4 text-right pr-6">Acties</th>
                    </tr>
                  </thead>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={localOrder.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      <tbody className="divide-y divide-border">
                        {localOrder.map(slot => (
                          <SortableRow
                            key={slot.id}
                            slot={slot}
                            onEdit={() => { setEditSlot(slot); setIsModalOpen(true); }}
                            onDelete={() => handleDelete(slot)}
                            onToggleActive={() => toggleActive(slot)}
                            onToggleHomeGame={() => toggleHomeGame(slot)}
                            isDeleting={isDeleting}
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </DndContext>
                </table>
              </div>

              {/* ── Mobile cards (< md) ── */}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={localOrder.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="md:hidden divide-y divide-border">
                    {localOrder.map(slot => (
                      <SortableCard
                        key={slot.id}
                        slot={slot}
                        onEdit={() => { setEditSlot(slot); setIsModalOpen(true); }}
                        onDelete={() => handleDelete(slot)}
                        onToggleActive={() => toggleActive(slot)}
                        onToggleHomeGame={() => toggleHomeGame(slot)}
                        isDeleting={isDeleting}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>

        <SlotFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          editSlot={editSlot}
          currentSlotsLength={slots?.length ?? 0}
        />
      </AppLayout>
    </AuthGuard>
  );
}
