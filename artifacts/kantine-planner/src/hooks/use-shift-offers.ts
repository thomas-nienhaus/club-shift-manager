import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { ShiftOffer, ShiftOfferResponse } from '@/lib/types';

const KEY = ['shift-offers'] as const;

type RawShift = { date: string; slot: string; start_time: string | null; end_time: string | null };
type RawVolunteer = { name: string };
type RawSwapShift = { date: string; slot: string } | null;

async function fetchShiftOffers(): Promise<ShiftOffer[]> {
  const { data, error } = await supabase
    .from('shift_offers')
    .select(`
      id, shift_id, volunteer_id, status, created_at,
      shift:shifts(date, slot, start_time, end_time),
      volunteer:volunteers!shift_offers_volunteer_id_fkey(name),
      responses:shift_offer_responses(
        id, offer_id, responder_id, type, swap_shift_id, status, created_at,
        responder:volunteers!shift_offer_responses_responder_id_fkey(name),
        swapShift:shifts!shift_offer_responses_swap_shift_id_fkey(date, slot)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const now = new Date();

  return (data ?? [])
    .filter(row => {
      // Verlopen open aanbiedingen verbergen (dienst heeft al plaatsgevonden)
      if (row.status !== 'open') return true;
      if (!(row as any).expires_at) return true;
      return new Date((row as any).expires_at) > now;
    })
    .map((row): ShiftOffer => {
    const shift = (row.shift as unknown as RawShift);
    const volunteer = (row.volunteer as unknown as RawVolunteer);
    const responses = (row.responses as unknown as Array<{
      id: number;
      offer_id: number;
      responder_id: number;
      type: string;
      swap_shift_id: number | null;
      status: string;
      created_at: string;
      responder: RawVolunteer;
      swapShift: RawSwapShift;
    }>);

    return {
      id: row.id,
      shiftId: row.shift_id,
      volunteerId: row.volunteer_id,
      status: row.status as ShiftOffer['status'],
      createdAt: row.created_at,
      shift: {
        date: shift.date,
        slot: shift.slot,
        startTime: shift.start_time,
        endTime: shift.end_time,
      },
      volunteer: { name: volunteer.name },
      responses: (responses ?? []).map((r): ShiftOfferResponse => ({
        id: r.id,
        offerId: r.offer_id,
        responderId: r.responder_id,
        type: r.type as ShiftOfferResponse['type'],
        swapShiftId: r.swap_shift_id,
        status: r.status as ShiftOfferResponse['status'],
        createdAt: r.created_at,
        responder: { name: r.responder.name },
        swapShift: r.swapShift ? { date: r.swapShift.date, slot: r.swapShift.slot } : null,
      })),
    };
  });
}

export function useListShiftOffers() {
  return useQuery({ queryKey: KEY, queryFn: fetchShiftOffers });
}

export function useCreateShiftOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ shiftId, volunteerId, shiftDate }: { shiftId: number; volunteerId: number; shiftDate: string }) => {
      // Verloopt op middernacht (UTC) van de dag van de dienst
      const expiresAt = new Date(shiftDate).toISOString();
      const { error } = await supabase
        .from('shift_offers')
        .insert({ shift_id: shiftId, volunteer_id: volunteerId, expires_at: expiresAt });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCancelShiftOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const { error } = await supabase
        .from('shift_offers')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateOfferResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      offerId, responderId, type, swapShiftId,
    }: {
      offerId: number;
      responderId: number;
      type: 'takeover' | 'swap';
      swapShiftId?: number | null;
    }) => {
      const { error } = await supabase
        .from('shift_offer_responses')
        .insert({
          offer_id: offerId,
          responder_id: responderId,
          type,
          swap_shift_id: swapShiftId ?? null,
        });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAcceptOfferResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ responseId, type }: { responseId: number; type: 'takeover' | 'swap' }) => {
      const rpc = type === 'takeover' ? 'execute_takeover' : 'execute_swap_offer';
      const { error } = await supabase.rpc(rpc, { p_response_id: responseId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ['shifts'] });
    },
  });
}

export function useDeclineOfferResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ responseId }: { responseId: number }) => {
      const { error } = await supabase
        .from('shift_offer_responses')
        .update({ status: 'declined' })
        .eq('id', responseId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
