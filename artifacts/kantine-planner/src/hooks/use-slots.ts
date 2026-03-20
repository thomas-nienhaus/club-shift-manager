import { useListAvailabilitySlots } from '@workspace/api-client-react';

export function useSlots() {
  const { data: slots, isLoading } = useListAvailabilitySlots();

  const activeSlots = (slots ?? [])
    .filter(s => s.isActive)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const getLabel = (key: string): string => {
    return slots?.find(s => s.key === key)?.label ?? key;
  };

  const getSortOrder = (key: string): number => {
    const s = slots?.find(sl => sl.key === key);
    return s?.sortOrder ?? 999;
  };

  return { slots: activeSlots, allSlots: slots ?? [], getLabel, getSortOrder, isLoading };
}
