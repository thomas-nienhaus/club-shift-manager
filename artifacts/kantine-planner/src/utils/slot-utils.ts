export const DAY_PREFIXES: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

export const DAYS = [
  { value: 'monday',    label: 'Maandag' },
  { value: 'tuesday',   label: 'Dinsdag' },
  { value: 'wednesday', label: 'Woensdag' },
  { value: 'thursday',  label: 'Donderdag' },
  { value: 'friday',    label: 'Vrijdag' },
  { value: 'saturday',  label: 'Zaterdag' },
  { value: 'sunday',    label: 'Zondag' },
];

export const DAY_LABELS: Record<string, string> =
  Object.fromEntries(DAYS.map(d => [d.value, d.label]));

export function slotDayIndex(slotKey: string): number | undefined {
  const prefix = slotKey.split('_')[0].toLowerCase();
  return DAY_PREFIXES[prefix];
}

export function getDayFromKey(key: string): string {
  return key.split('_')[0];
}

export function makeLabelSlug(label: string): string {
  return label.toLowerCase()
    .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}
