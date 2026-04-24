import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateShift, useUpdateShift } from '@/hooks/use-shifts';
import type { ShiftWithAssignments } from '@/lib/types';
import { format, getDay, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useSlots } from '@/hooks/use-slots';
import { AlertCircle } from 'lucide-react';
import { slotDayIndex } from '@/utils/slot-utils';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editShift?: ShiftWithAssignments | null;
  defaultDate?: Date;
}

export function ShiftFormModal({ isOpen, onClose, editShift, defaultDate }: ShiftFormModalProps) {
  const [date, setDate] = useState(format(defaultDate || new Date(), 'yyyy-MM-dd'));
  const [slot, setSlot] = useState<string>('saturday_morning');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const { slots: activeSlots, allSlots } = useSlots();

  const { toast } = useToast();

  const { mutate: createShift, isPending: isCreating } = useCreateShift();
  const { mutate: updateShift, isPending: isUpdating } = useUpdateShift();

  const activeSlotsForDay = useMemo(() => {
    if (!date) return activeSlots;
    const dow = getDay(parseISO(date));
    return activeSlots.filter(s => {
      const idx = slotDayIndex(s.key);
      return idx === undefined || idx === dow;
    });
  }, [date, activeSlots]);

  const allSlotsForDay = useMemo(() => {
    if (!date) return allSlots;
    const dow = getDay(parseISO(date));
    return allSlots.filter(s => {
      const idx = slotDayIndex(s.key);
      return idx === undefined || idx === dow;
    });
  }, [date, allSlots]);

  const slotStatus = activeSlotsForDay.length > 0 ? 'available'
    : allSlotsForDay.length > 0 ? 'inactive'
    : 'none';

  useEffect(() => {
    if (activeSlotsForDay.length > 0 && !activeSlotsForDay.some(s => s.key === slot)) {
      setSlot(activeSlotsForDay[0].key);
    }
  }, [activeSlotsForDay]);

  useEffect(() => {
    if (editShift && isOpen) {
      setDate(editShift.date);
      setSlot(editShift.slot);
      setStartTime(editShift.startTime ?? '');
      setEndTime(editShift.endTime ?? '');
      setNotes(editShift.notes || '');
    } else if (isOpen) {
      setDate(format(defaultDate || new Date(), 'yyyy-MM-dd'));
      setSlot(activeSlots[0]?.key ?? 'saturday_morning');
      setStartTime('');
      setEndTime('');
      setNotes('');
    }
  }, [editShift, isOpen, defaultDate, activeSlots.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const timeData = { startTime: startTime || null, endTime: endTime || null };

    if (editShift) {
      updateShift({ id: editShift.id, data: { date, slot, capacity: 99, notes, ...timeData } }, {
        onSuccess: () => { toast({ title: 'Dienst bijgewerkt', description: 'De wijzigingen zijn opgeslagen.' }); onClose(); },
        onError: (err: any) => toast({ title: 'Fout', description: err.message, variant: 'destructive' }),
      });
    } else {
      createShift({ data: { date, slot, capacity: 99, notes, ...timeData } }, {
        onSuccess: () => { toast({ title: 'Dienst aangemaakt', description: 'De nieuwe dienst is toegevoegd aan de planning.' }); onClose(); },
        onError: (err: any) => toast({ title: 'Fout', description: err.message, variant: 'destructive' }),
      });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editShift ? 'Dienst Bewerken' : 'Nieuwe Dienst'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label-text">Datum</label>
            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-text">Dagdeel / Tijdslot</label>
            {slotStatus === 'available' && (
              <select required value={slot} onChange={e => setSlot(e.target.value)} className="input-field">
                {activeSlotsForDay.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            )}
            {slotStatus === 'inactive' && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>Het dagdeel voor deze dag bestaat maar is <strong>niet actief</strong>. Activeer het via <strong>Instellingen → Dagdelen</strong>.</span>
              </div>
            )}
            {slotStatus === 'none' && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>Geen dagdeel aangemaakt voor deze dag. Maak er eerst een aan via <strong>Instellingen → Dagdelen</strong>.</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label-text">Begintijd (optioneel)</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="label-text">Eindtijd (optioneel)</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field" />
          </div>
        </div>
        <div>
          <label className="label-text">Extra Notities (optioneel)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-field min-h-[100px] resize-y" placeholder="Bijv. Sleutels ophalen bij Jan..." />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>Annuleren</button>
          <button type="submit" className="btn-primary" disabled={isPending || slotStatus !== 'available'}>{isPending ? 'Bezig...' : 'Opslaan'}</button>
        </div>
      </form>
    </Modal>
  );
}
