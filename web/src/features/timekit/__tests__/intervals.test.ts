import { describe, expect, it } from 'vitest';

import {
  clampIntervals,
  intervalsOverlap,
  mergeIntervals,
  padIntervals,
  subtractIntervals,
  totalDurationMs,
} from '../domain/intervals';
import type { Interval } from '../domain/types';

/** Compact notation so the expectations stay readable. */
const iv = (start: number, end: number): Interval => ({ start, end });

describe('mergeIntervals', () => {
  it('sorts and coalesces overlapping intervals', () => {
    expect(mergeIntervals([iv(5, 8), iv(1, 3), iv(2, 6)])).toEqual([iv(1, 8)]);
  });

  it('coalesces touching intervals', () => {
    expect(mergeIntervals([iv(1, 2), iv(2, 3)])).toEqual([iv(1, 3)]);
  });

  it('keeps disjoint intervals apart', () => {
    expect(mergeIntervals([iv(1, 2), iv(3, 4)])).toEqual([iv(1, 2), iv(3, 4)]);
  });

  it('drops empty and inverted intervals', () => {
    expect(mergeIntervals([iv(5, 5), iv(9, 4), iv(1, 2)])).toEqual([iv(1, 2)]);
  });

  it('does not mutate its input', () => {
    const input = [iv(3, 4), iv(1, 2)];
    const copy = input.map((i) => ({ ...i }));
    mergeIntervals(input);
    expect(input).toEqual(copy);
  });
});

describe('subtractIntervals', () => {
  it('punches a hole in the middle', () => {
    expect(subtractIntervals([iv(0, 10)], [iv(4, 6)])).toEqual([iv(0, 4), iv(6, 10)]);
  });

  it('trims from the start and the end', () => {
    expect(subtractIntervals([iv(0, 10)], [iv(0, 3)])).toEqual([iv(3, 10)]);
    expect(subtractIntervals([iv(0, 10)], [iv(7, 10)])).toEqual([iv(0, 7)]);
  });

  it('removes a fully covered interval', () => {
    expect(subtractIntervals([iv(2, 8)], [iv(0, 10)])).toEqual([]);
  });

  it('ignores holes that do not intersect', () => {
    expect(subtractIntervals([iv(0, 5)], [iv(6, 9)])).toEqual([iv(0, 5)]);
  });

  it('applies several holes across several regions', () => {
    expect(
      subtractIntervals([iv(0, 10), iv(20, 30)], [iv(2, 4), iv(8, 22), iv(26, 27)]),
    ).toEqual([iv(0, 2), iv(4, 8), iv(22, 26), iv(27, 30)]);
  });

  it('returns the base unchanged when there are no holes', () => {
    expect(subtractIntervals([iv(0, 5)], [])).toEqual([iv(0, 5)]);
  });
});

describe('padIntervals', () => {
  it('widens each interval outward', () => {
    expect(padIntervals([iv(10, 20)], 2, 3)).toEqual([iv(8, 23)]);
  });

  it('merges intervals that padding pushes together', () => {
    expect(padIntervals([iv(0, 5), iv(8, 10)], 0, 3)).toEqual([iv(0, 13)]);
  });
});

describe('clampIntervals', () => {
  it('restricts to the window and drops what falls outside', () => {
    expect(clampIntervals([iv(0, 5), iv(10, 20), iv(30, 40)], iv(3, 15))).toEqual([
      iv(3, 5),
      iv(10, 15),
    ]);
  });
});

describe('helpers', () => {
  it('detects overlap on half-open semantics', () => {
    expect(intervalsOverlap(iv(0, 5), iv(5, 9))).toBe(false);
    expect(intervalsOverlap(iv(0, 5), iv(4, 9))).toBe(true);
  });

  it('totals duration after merging, so overlap is not double counted', () => {
    expect(totalDurationMs([iv(0, 10), iv(5, 15)])).toBe(15);
  });
});
