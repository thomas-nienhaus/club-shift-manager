import React, { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useListVolunteers } from '@/hooks/use-volunteers';
import { useAssignVolunteer } from '@/hooks/use-shifts';
import type { ShiftWithAssignments } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, AlertTriangle } from 'lucide-react';
import { useSlots } from '@/hooks/use-slots';
import { supabase } from '@/lib/supabase';

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ShiftWithAssignments | null;
}

export function AssignModal({ isOpen, onClose, shift }: AssignModalProps) {
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string>('');
  const [groupMembersToAssign, setGroupMembersToAssign] = useState<Set<number>>(new Set());

  const { toast } = useToast();
  const { getLabel } = useSlots();

  const { data: volunteers, isLoading: isLoadingVolunteers } = useListVolunteers();
  const { mutate: assignVolunteer, isPending } = useAssignVolunteer();

  const alreadyAssignedIds = new Set(shift?.assignments.map(a => a.volunteerId) ?? []);

  const availableVolunteers = (volunteers ?? []).filter(v => {
    if (alreadyAssignedIds.has(v.id)) return false;
    if (!shift) return false;
    if (v.availability.length === 0) return true;
    return v.availability.includes(shift.slot);
  });

  const unavailableVolunteers = (volunteers ?? []).filter(v => {
    if (alreadyAssignedIds.has(v.id)) return false;
    if (!shift) return false;
    if (v.availability.length === 0) return false;
    return !v.availability.includes(shift.slot);
  });

  const selectedVolunteer = volunteers?.find(v => v.id === parseInt(selectedVolunteerId));
  const unassignedGroupMembers = (selectedVolunteer?.groupMembers ?? []).filter(m => !alreadyAssignedIds.has(m.id));

  const handleVolunteerChange = (id: string) => {
    setSelectedVolunteerId(id);
    const vol = volunteers?.find(v => v.id === parseInt(id));
    const unassigned = (vol?.groupMembers ?? []).filter(m => !alreadyAssignedIds.has(m.id));
    setGroupMembersToAssign(new Set(unassigned.map(m => m.id)));
  };

  const toggleGroupMember = (id: number) => {
    setGroupMembersToAssign(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleClose = () => {
    setSelectedVolunteerId('');
    setGroupMembersToAssign(new Set());
    onClose();
  };

  const doAssign = (shiftId: number, volId: number): Promise<void> =>
    new Promise((resolve, reject) => {
      assignVolunteer({ id: shiftId, data: { volunteerId: volId } }, {
        onSuccess: () => resolve(),
        onError: (err) => reject(err),
      });
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift || !selectedVolunteerId) return;
    const volId = parseInt(selectedVolunteerId);
    try {
      await doAssign(shift.id, volId);
      for (const memberId of groupMembersToAssign) {
        await doAssign(shift.id, memberId);
      }
      toast({ title: 'Succes', description: 'Vrijwilliger(s) ingedeeld.' });
      handleClose();
    } catch (err: any) {
      toast({ title: 'Fout', description: err.message ?? 'Er is iets fout gegaan.', variant: 'destructive' });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Vrijwilliger Indelen">
      <form onSubmit={handleSubmit} className="space-y-5">
        {shift && (
          <div className="bg-muted/60 rounded-xl px-4 py-3 text-sm text-muted-foreground font-medium">
            Dagdeel: <span className="text-foreground font-bold">{getLabel(shift.slot)}</span>
          </div>
        )}
        <div>
          <label className="label-text">Selecteer Vrijwilliger</label>
          {isLoadingVolunteers ? (
            <div className="flex items-center gap-2 text-muted-foreground p-4"><Loader2 className="w-5 h-5 animate-spin" /> Laden...</div>
          ) : availableVolunteers.length === 0 && unavailableVolunteers.length === 0 ? (
            <div className="p-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl">Alle vrijwilligers zijn al ingedeeld voor deze dienst.</div>
          ) : (
            <select required value={selectedVolunteerId} onChange={e => handleVolunteerChange(e.target.value)} className="input-field">
              <option value="" disabled>— Kies een vrijwilliger —</option>
              {availableVolunteers.length > 0 && (
                <optgroup label="Beschikbaar voor dit dagdeel">
                  {availableVolunteers.map(v => <option key={v.id} value={v.id}>{v.name}{v.groupMembers?.length ? ` 👥 groep (${v.groupMembers.length + 1})` : ''}</option>)}
                </optgroup>
              )}
              {unavailableVolunteers.length > 0 && (
                <optgroup label="Niet beschikbaar voor dit dagdeel">
                  {unavailableVolunteers.map(v => <option key={v.id} value={v.id}>{v.name} (beschikbaar: {v.availability.map(s => getLabel(s)).join(', ') || 'geen'})</option>)}
                </optgroup>
              )}
            </select>
          )}
        </div>

        {selectedVolunteer && unavailableVolunteers.some(v => v.id === selectedVolunteer.id) && (
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span><strong>{selectedVolunteer.name}</strong> is normaal niet beschikbaar voor <strong>{getLabel(shift!.slot)}</strong>. Je kunt hem/haar toch indelen.</span>
          </div>
        )}

        {unassignedGroupMembers.length > 0 && (
          <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Users className="w-4 h-4" />Groep van {selectedVolunteer!.groupMembers!.length + 1} — ook indelen?
            </div>
            <div className="space-y-2">
              {unassignedGroupMembers.map(m => (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={groupMembersToAssign.has(m.id)} onChange={() => toggleGroupMember(m.id)} className="w-4 h-4 accent-primary" />
                  <span className="text-sm text-foreground font-medium">{m.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {selectedVolunteer?.groupMembers?.some(m => alreadyAssignedIds.has(m.id)) && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
            <Users className="w-4 h-4" />
            {selectedVolunteer.groupMembers.filter(m => alreadyAssignedIds.has(m.id)).map(m => m.name).join(', ')} {selectedVolunteer.groupMembers.filter(m => alreadyAssignedIds.has(m.id)).length === 1 ? 'is' : 'zijn'} al ingedeeld.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button type="button" onClick={handleClose} className="btn-secondary" disabled={isPending}>Annuleren</button>
          <button type="submit" className="btn-primary" disabled={isPending || !selectedVolunteerId}>
            {isPending ? 'Indelen...' : groupMembersToAssign.size > 0 ? `${groupMembersToAssign.size + 1} indelen` : 'Indelen'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
