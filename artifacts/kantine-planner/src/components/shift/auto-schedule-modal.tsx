import React, { useState } from 'react';
import { Shuffle, X, AlertCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useListSeasons } from '@/hooks/use-seasons';
import { runAutoSchedule } from '@/utils/auto-schedule';

export function AutoScheduleModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: seasons } = useListSeasons();

  const { mutate: doAutoSchedule, isPending } = useMutation({
    mutationFn: ({ seasonId }: { seasonId: number | null }) =>
      runAutoSchedule(seasonId ?? undefined),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      toast({ title: 'Automatisch ingedeeld', description: result.message });
      onClose();
    },
    onError: () => {
      toast({ title: 'Fout', description: 'Er is iets misgegaan bij het automatisch indelen.', variant: 'destructive' });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10"><Shuffle className="w-5 h-5 text-primary" /></div>
            <h2 className="text-xl font-display font-bold">Automatisch Indelen</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-bold mb-1">Hoe werkt het?</p>
              <ul className="space-y-1 text-amber-700">
                <li>• Alleen lege diensten (zonder vrijwilligers) worden gevuld</li>
                <li>• Vrijwilligers worden ingedeeld op hun beschikbare dagdelen</li>
                <li>• Groepen worden samen ingedeeld</li>
                <li>• Elke vrijwilliger krijgt ongeveer evenveel diensten</li>
              </ul>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-2">Seizoen (optioneel)</label>
            <select
              value={selectedSeasonId ?? ''}
              onChange={e => setSelectedSeasonId(e.target.value ? Number(e.target.value) : null)}
              className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Alle diensten</option>
              {seasons?.map(season => (
                <option key={season.id} value={season.id}>{season.name}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1.5">Laat leeg om alle diensten in het systeem te verwerken.</p>
          </div>
        </div>
        <div className="flex gap-3 p-6 pt-0">
          <button onClick={onClose} disabled={isPending} className="flex-1 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors">Annuleren</button>
          <button onClick={() => doAutoSchedule({ seasonId: selectedSeasonId })} disabled={isPending} className="flex-1 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
            {isPending ? <><Shuffle className="w-4 h-4 animate-spin" />Bezig...</> : <><Shuffle className="w-4 h-4" />Indelen</>}
          </button>
        </div>
      </div>
    </div>
  );
}
