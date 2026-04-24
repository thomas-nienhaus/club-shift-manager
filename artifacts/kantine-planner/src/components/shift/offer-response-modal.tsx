import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { X, ArrowLeftRight, UserCheck } from 'lucide-react';
import type { ShiftOffer, ShiftWithAssignments } from '@/lib/types';
import { useSlots } from '@/hooks/use-slots';
import { useCreateOfferResponse } from '@/hooks/use-shift-offers';
import { useToast } from '@/hooks/use-toast';

interface OfferResponseModalProps {
  offer: ShiftOffer | null;
  myVolunteerId: number;
  myShifts: ShiftWithAssignments[];
  isOpen: boolean;
  onClose: () => void;
}

export function OfferResponseModal({
  offer, myVolunteerId, myShifts, isOpen, onClose,
}: OfferResponseModalProps) {
  const [mode, setMode] = useState<'choose' | 'swap'>('choose');
  const [selectedSwapShiftId, setSelectedSwapShiftId] = useState<number | ''>('');
  const { getLabel } = useSlots();
  const { toast } = useToast();
  const { mutate: createResponse, isPending } = useCreateOfferResponse();

  if (!isOpen || !offer) return null;

  const handleClose = () => {
    setMode('choose');
    setSelectedSwapShiftId('');
    onClose();
  };

  const handleTakeover = () => {
    createResponse(
      { offerId: offer.id, responderId: myVolunteerId, type: 'takeover' },
      {
        onSuccess: () => {
          toast({ title: 'Reactie verstuurd', description: 'Je wilt de dienst overnemen. De aanbieder beslist.' });
          handleClose();
        },
        onError: () => toast({ title: 'Fout', description: 'Kon niet reageren op dit aanbod.', variant: 'destructive' }),
      }
    );
  };

  const handleSwap = () => {
    if (!selectedSwapShiftId) return;
    createResponse(
      { offerId: offer.id, responderId: myVolunteerId, type: 'swap', swapShiftId: Number(selectedSwapShiftId) },
      {
        onSuccess: () => {
          toast({ title: 'Ruilvoorstel verstuurd', description: 'De aanbieder beslist of hij/zij wil ruilen.' });
          handleClose();
        },
        onError: () => toast({ title: 'Fout', description: 'Kon ruilvoorstel niet versturen.', variant: 'destructive' }),
      }
    );
  };

  const offeredDate = format(parseISO(offer.shift.date), 'EEEE d MMMM', { locale: nl });
  const offeredSlot = getLabel(offer.shift.slot);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-display font-bold">Reageren op aanbod</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-primary/5 border-2 border-primary/20 rounded-2xl p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-1">Aangeboden dienst</p>
            <p className="font-bold text-foreground capitalize">{offeredDate}</p>
            <p className="text-sm text-muted-foreground">{offeredSlot}</p>
            {offer.shift.startTime && offer.shift.endTime && (
              <p className="text-sm text-muted-foreground">{offer.shift.startTime} – {offer.shift.endTime}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Aangeboden door: <span className="font-semibold">{offer.volunteer.name}</span></p>
          </div>

          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={handleTakeover}
                disabled={isPending}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-left disabled:opacity-50"
              >
                <UserCheck className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="font-bold">Ik neem het over</p>
                  <p className="text-sm text-muted-foreground">Jij neemt de dienst, de aanbieder is vrij.</p>
                </div>
              </button>

              <button
                onClick={() => setMode('swap')}
                disabled={isPending || myShifts.length === 0}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-border hover:border-primary/30 hover:bg-muted/30 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeftRight className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-bold">Ik wil ruilen</p>
                  <p className="text-sm text-muted-foreground">
                    {myShifts.length === 0
                      ? 'Je hebt geen toekomstige diensten om mee te ruilen.'
                      : 'Bied één van jouw eigen diensten aan als ruil.'}
                  </p>
                </div>
              </button>
            </div>
          )}

          {mode === 'swap' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Selecteer jouw dienst om te ruilen</label>
                <select
                  value={selectedSwapShiftId}
                  onChange={e => setSelectedSwapShiftId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Kies een dienst...</option>
                  {myShifts.map(s => (
                    <option key={s.id} value={s.id}>
                      {format(parseISO(s.date), 'EEEE d MMMM', { locale: nl })} — {getLabel(s.slot)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setMode('choose'); setSelectedSwapShiftId(''); }}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-xl border border-border font-bold hover:bg-muted transition-colors"
                >
                  Terug
                </button>
                <button
                  onClick={handleSwap}
                  disabled={isPending || !selectedSwapShiftId}
                  className="flex-1 py-3 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Versturen...' : 'Ruilvoorstel versturen'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
