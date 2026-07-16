/**
 * Seeded pseudo-random number generator for daily challenge mode.
 * Uses the mulberry32 algorithm for deterministic sequences.
 */

/**
 * Hash a string into a 32-bit integer using DJB2 algorithm.
 * Exported for testing purposes.
 */
export function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

/**
 * Mulberry32 PRNG — produces deterministic values in [0, 1) from a 32-bit seed.
 */
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a seeded random number generator from a seed string.
 * Same seed always produces the same sequence of values.
 *
 * @param seed - A string to use as the seed (e.g., 'YYYY-MM-DD' date)
 * @returns A function that returns deterministic numbers in [0, 1) on each call
 */
export function createSeededRNG(seed: string): () => number {
  const hash = hashString(seed);
  return mulberry32(hash);
}

/**
 * Get today's date as a 'YYYY-MM-DD' seed string.
 */
export function getTodaysSeed(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
