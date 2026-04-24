import React from 'react';
import { useDeleteShift, useUnassignVolunteer } from '@/hooks/use-shifts';
import type { ShiftWithAssignments } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useSlots } from '@/hooks/use-slots';
import { Users, Trash2, Edit2, UserPlus, X, RefreshCw, Clock, ArrowLeftRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PLACEHOLDER_NOTE = 'Om beurten een elftal';

interface ShiftCardProps {
  shift: ShiftWithAssignments;
  onEdit: (shift: ShiftWithAssignments) => void;
  onAssign: (shift: ShiftWithAssignments) => void;
  onOffer?: (shift: ShiftWithAssignments) => void;
  myVolunteerId?: number | null;
  hasOpenOffer?: boolean;
  adminMode?: boolean;
}

function formatTimeRange(startTime?: string | null, endTime?: string | null): string | null {
  if (startTime && endTime) return `${startTime} – ${endTime}`;
  if (startTime) return `Vanaf ${startTime}`;
  if (endTime) return `Tot ${endTime}`;
  return null;
}

export function ShiftCard({ shift, onEdit, onAssign, onOffer, myVolunteerId, hasOpenOffer, adminMode = false }: ShiftCardProps) {
  const { toast } = useToast();
  const { getLabel } = useSlots();
  const timeRange = formatTimeRange(shift.startTime, shift.endTime);

  const { mutate: deleteShift, isPending: isDeleting } = useDeleteShift();
  const { mutate: unassignVolunteer, isPending: isUnassigning } = useUnassignVolunteer();

  const isMyShift = !!myVolunteerId && shift.assignments.some(a => a.volunteerId === myVolunteerId);
  const isFuture = new Date(shift.date) >= new Date(new Date().toDateString());

  const isPlaceholder = shift.notes === PLACEHOLDER_NOTE;

  const handleDelete = () => {
    if (window.confirm('Weet je zeker dat je deze dienst wilt verwijderen?')) {
      deleteShift({ id: shift.id }, {
        onSuccess: () => toast({ title: 'Verwijderd', description: 'Dienst is verwijderd.' }),
      });
    }
  };

  const handleUnassign = (volunteerId: number, name: string) => {
    if (window.confirm(`Weet je zeker dat je ${name} van deze dienst wilt halen?`)) {
      unassignVolunteer({ id: shift.id, volunteerId }, {
        onSuccess: () => toast({ title: 'Verwijderd', description: `${name} is van de dienst gehaald.` }),
      });
    }
  };

  if (isPlaceholder) {
    return (
      <div className="shift-card flex flex-col bg-muted/30 rounded-2xl border-2 border-dashed border-border/50 transition-all duration-300 opacity-70">
        <div className="shift-card-header p-4 flex items-center justify-between border-b border-border/40 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground"><RefreshCw className="w-5 h-5" /></div>
            <div>
              <h3 className="font-display font-bold text-lg leading-tight text-muted-foreground">{getLabel(shift.slot)}</h3>
              {timeRange && <p className="text-xs font-semibold text-muted-foreground/60 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{timeRange}</p>}
              <p className="text-sm font-semibold text-muted-foreground/70">Geen vrijwilligers nodig</p>
            </div>
          </div>
          {adminMode && (
            <div className="flex gap-1 no-print">
              <button onClick={() => onEdit(shift)} disabled={isDeleting} className="p-2 rounded-lg text-muted-foreground hover:bg-white/70 hover:text-foreground transition-colors" title="Bewerken"><Edit2 className="w-4 h-4" /></button>
              <button onClick={handleDelete} disabled={isDeleting} className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Verwijderen"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="p-5 flex-1 flex items-center justify-center">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-muted-foreground italic">{PLACEHOLDER_NOTE}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("shift-card flex flex-col bg-card rounded-2xl border-2 border-border/60 shadow-sm hover:border-primary/30 hover:shadow-md transition-all duration-300")}>
      <div className="shift-card-header p-4 flex items-center justify-between border-b border-border/60 rounded-t-xl bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Users className="w-5 h-5" /></div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-lg leading-tight">{getLabel(shift.slot)}</h3>
              {hasOpenOffer && (
                <span className="text-xs bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full no-print">Aangeboden</span>
              )}
            </div>
            {timeRange && <p className="text-xs font-semibold text-primary/70 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{timeRange}</p>}
            <p className="text-sm font-semibold text-muted-foreground">
              {shift.assignments.length === 0 ? 'Nog niemand ingedeeld' : `${shift.assignments.length} vrijwilliger${shift.assignments.length !== 1 ? 's' : ''} ingedeeld`}
            </p>
          </div>
        </div>
        {adminMode && (
          <div className="flex gap-1 no-print">
            <button onClick={() => onEdit(shift)} disabled={isDeleting} className="p-2 rounded-lg text-muted-foreground hover:bg-white/70 hover:text-foreground transition-colors" title="Bewerken"><Edit2 className="w-4 h-4" /></button>
            <button onClick={handleDelete} disabled={isDeleting} className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Verwijderen"><Trash2 className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        {shift.notes && (
          <p className="text-sm text-muted-foreground italic bg-muted/50 p-3 rounded-xl border border-border/50">"{shift.notes}"</p>
        )}
        <div className="flex-1">
          <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2 uppercase tracking-wide"><Users className="w-4 h-4 text-muted-foreground" />Ingedeeld</h4>
          {shift.assignments.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center border-2 border-dashed border-border rounded-xl">Nog niemand ingedeeld</div>
          ) : (
            <ul className="space-y-2">
              {shift.assignments.map((assignment) => (
                <li key={assignment.id} className="flex items-center justify-between bg-muted/30 border border-border/50 p-2 pl-3 rounded-lg group print-break-inside-avoid">
                  <span className="font-semibold text-sm">{assignment.volunteer.name}</span>
                  {adminMode && (
                    <button onClick={() => handleUnassign(assignment.volunteerId, assignment.volunteer.name)} disabled={isUnassigning} className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity no-print" title="Verwijder van dienst"><X className="w-4 h-4" /></button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {adminMode && (
        <div className="p-4 border-t bg-muted/10 rounded-b-xl no-print">
          <button onClick={() => onAssign(shift)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all border border-primary/20 hover:border-primary shadow-sm">
            <UserPlus className="w-4 h-4" />Vrijwilliger Indelen
          </button>
        </div>
      )}

      {onOffer && isMyShift && isFuture && !hasOpenOffer && (
        <div className="p-4 border-t bg-muted/10 rounded-b-xl no-print">
          <button onClick={() => onOffer(shift)} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all border border-primary/20 hover:border-primary shadow-sm">
            <ArrowLeftRight className="w-4 h-4" />Dienst Aanbieden
          </button>
        </div>
      )}
    </div>
  );
}
