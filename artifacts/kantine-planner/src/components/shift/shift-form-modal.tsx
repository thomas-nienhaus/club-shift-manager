import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '@/components/ui/modal';
import { useCreateShift, useUpdateShift, type ShiftWithAssignments } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, getDay, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useSlots } from '@/hooks/use-slots';

const DAY_PREFIXES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function slotDayIndex(slotKey: string): number | undefined {
  const prefix = slotKey.split('_')[0].toLowerCase();
  return DAY_PREFIXES[prefix];
}

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
  const { slots: activeSlots } = useSlots();

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { mutate: createShift, isPending: isCreating } = useCreateShift();
  const { mutate: updateShift, isPending: isUpdating } = useUpdateShift();

  // Only show slots whose day-prefix matches the selected date's weekday
  const filteredSlots = useMemo(() => {
    if (!date) return activeSlots;
    const dayOfWeek = getDay(parseISO(date));
    const matching = activeSlots.filter(s => {
      const idx = slotDayIndex(s.key);
      return idx === undefined || idx === dayOfWeek; // unknown prefix → always show
    });
    return matching.length > 0 ? matching : activeSlots; // fallback: show all
  }, [date, activeSlots]);

  // Reset slot when date changes and current slot no longer fits
  useEffect(() => {
    if (!date) return;
    const dayOfWeek = getDay(parseISO(date));
    const currentIdx = slotDayIndex(slot);
    if (currentIdx !== undefined && currentIdx !== dayOfWeek) {
      const first = filteredSlots[0];
      if (first) setSlot(first.key);
    }
  }, [date]);

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

    const timeData = {
      startTime: startTime || null,
      endTime: endTime || null,
    };

    if (editShift) {
      updateShift({
        id: editShift.id,
        data: { date, slot, capacity: 99, notes, ...timeData }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
          toast({ title: "Dienst bijgewerkt", description: "De wijzigingen zijn opgeslagen." });
          onClose();
        },
        onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" })
      });
    } else {
      createShift({
        data: { date, slot, capacity: 99, notes, ...timeData }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
          toast({ title: "Dienst aangemaakt", description: "De nieuwe dienst is toegevoegd aan de planning." });
          onClose();
        },
        onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" })
      });
    }
  };

  const isPending = isCreating || isUpdating;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editShift ? "Dienst Bewerken" : "Nieuwe Dienst"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="label-text">Datum</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Dagdeel / Tijdslot</label>
            <select
              required
              value={slot}
              onChange={e => setSlot(e.target.value)}
              className="input-field"
            >
              {filteredSlots.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="label-text">Begintijd (optioneel)</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label-text">Eindtijd (optioneel)</label>
            <input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="label-text">Extra Notities (optioneel)</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="input-field min-h-[100px] resize-y"
            placeholder="Bijv. Sleutels ophalen bij Jan..."
          />
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
