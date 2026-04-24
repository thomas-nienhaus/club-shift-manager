import { describe, it, expect } from 'vitest';
import {
  slotDayIndex,
  getDayFromKey,
  makeLabelSlug,
  DAY_LABELS,
  DAYS,
} from '../slot-utils';

describe('slotDayIndex', () => {
  it('herkent bekende dag-prefixen', () => {
    expect(slotDayIndex('saturday_morning')).toBe(6);
    expect(slotDayIndex('wednesday_evening')).toBe(3);
    expect(slotDayIndex('friday_evening')).toBe(5);
    expect(slotDayIndex('monday_morning')).toBe(1);
    expect(slotDayIndex('sunday_afternoon')).toBe(0);
  });

  it('is case-insensitief', () => {
    expect(slotDayIndex('FRIDAY_avond')).toBe(5);
    expect(slotDayIndex('Saturday_Morning')).toBe(6);
  });

  it('geeft undefined terug voor onbekende prefix', () => {
    expect(slotDayIndex('unknown_slot')).toBeUndefined();
    expect(slotDayIndex('avond')).toBeUndefined();
    expect(slotDayIndex('')).toBeUndefined();
  });
});

describe('getDayFromKey', () => {
  it('extraheert het dag-gedeelte uit een sleutel', () => {
    expect(getDayFromKey('saturday_morning')).toBe('saturday');
    expect(getDayFromKey('friday_avond')).toBe('friday');
    expect(getDayFromKey('wednesday_evening')).toBe('wednesday');
  });

  it('geeft de hele string terug als er geen underscore is', () => {
    expect(getDayFromKey('friday')).toBe('friday');
  });
});

describe('makeLabelSlug', () => {
  it('zet een label om naar een geldige slug', () => {
    expect(makeLabelSlug('Avond')).toBe('avond');
    expect(makeLabelSlug('Ochtend')).toBe('ochtend');
    expect(makeLabelSlug('Vroege Ochtend')).toBe('vroege_ochtend');
  });

  it('vervangt speciale tekens door underscores', () => {
    expect(makeLabelSlug('Ochtend & Middag')).toBe('ochtend_middag');
    expect(makeLabelSlug('Avond!')).toBe('avond');
  });

  it('verwijdert leading/trailing underscores', () => {
    expect(makeLabelSlug(' avond ')).toBe('avond');
  });
});

describe('DAY_LABELS', () => {
  it('bevat Nederlandse dagnamen voor alle Engelse sleutels', () => {
    expect(DAY_LABELS['monday']).toBe('Maandag');
    expect(DAY_LABELS['tuesday']).toBe('Dinsdag');
    expect(DAY_LABELS['wednesday']).toBe('Woensdag');
    expect(DAY_LABELS['thursday']).toBe('Donderdag');
    expect(DAY_LABELS['friday']).toBe('Vrijdag');
    expect(DAY_LABELS['saturday']).toBe('Zaterdag');
    expect(DAY_LABELS['sunday']).toBe('Zondag');
  });
});

describe('DAYS', () => {
  it('bevat alle 7 dagen in de juiste volgorde (ma–zo)', () => {
    expect(DAYS).toHaveLength(7);
    expect(DAYS[0].value).toBe('monday');
    expect(DAYS[6].value).toBe('sunday');
  });
});
