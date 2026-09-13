import { describe, expect, test } from 'vitest';
import { CAMPUS_TIME_ZONE, campusDateBounds, campusDateKey, campusDateTime, campusTime, parseCampusDate } from '../utils/campusTime.js';

describe('Asia/Colombo campus time', () => {
  test('uses Colombo across UTC midnight and month boundaries', () => {
    expect(CAMPUS_TIME_ZONE).toBe('Asia/Colombo');
    expect(campusDateKey(new Date('2026-01-31T18:30:00.000Z'))).toBe('2026-02-01');
    expect(campusDateKey(new Date('2026-02-28T18:30:00.000Z'))).toBe('2026-03-01');
    expect(campusTime(new Date('2026-01-31T18:30:00.000Z'))).toBe('00:00');
  });

  test('validates campus dates and produces inclusive day boundaries', () => {
    expect(parseCampusDate('2026-02-29')).toBeNull();
    const bounds = campusDateBounds('2024-02-29');
    expect(bounds.date.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    expect(bounds.nextDate.toISOString()).toBe('2024-03-01T00:00:00.000Z');
  });

  test('maps opening and closing boundaries without machine-local time', () => {
    expect(campusDateTime('2026-04-01', '06:00').toISOString()).toBe('2026-04-01T00:30:00.000Z');
    expect(campusDateTime('2026-04-01', '22:00').toISOString()).toBe('2026-04-01T16:30:00.000Z');
    expect(campusDateTime('2026-04-01', '24:00')).toBeNull();
  });
});
