import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { PitchMapper } from '../game/PitchMapper';
import { CalibrationManager } from '../audio/CalibrationManager';
import { checkObstacleCollision, checkBoundaryViolation } from '../game/CollisionDetector';
import { ScoreTracker } from '../game/ScoreTracker';
import { ObstacleGenerator } from '../game/ObstacleGenerator';
import { createSeededRNG } from '../game/SeededRNG';
import { GAME_CONFIG } from '../game/config';

// Mock localStorage for tests that need it
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
});

describe('Property-Based Tests', () => {
  beforeEach(() => {
    // Clear mock storage between tests
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  // ─── Property 3: Linear Pitch-to-Altitude Mapping ───────────────────────────
  describe('Property 3: Linear Pitch-to-Altitude Mapping', () => {
    it('maps frequency linearly to altitude using default range', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 80, max: 500, noNaN: true }),
          fc.float({ min: 100, max: 2000, noNaN: true }),
          (frequency, canvasHeight) => {
            // No calibration stored → defaults to {min: 80, max: 500}
            const calibrationManager = new CalibrationManager();
            const mapper = new PitchMapper(calibrationManager);

            // Start at a position where smoothing won't interfere:
            // set current altitude to the expected target so diff is 0
            const expectedAltitude = ((frequency - 80) / 420) * canvasHeight;

            // Call with currentAltitude = expectedAltitude so smoothing doesn't cap
            const result = mapper.mapToAltitude(frequency, expectedAltitude, 0.016, canvasHeight);

            expect(result).toBeCloseTo(expectedAltitude, 1);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 4: Null-Pitch Descent Rate ────────────────────────────────────
  describe('Property 4: Null-Pitch Descent Rate', () => {
    it('descends at most 150 * deltaTime px when frequency is null, never below 0', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
          fc.float({ min: 100, max: 2000, noNaN: true }),
          (currentAltitude, deltaTime, canvasHeight) => {
            const calibrationManager = new CalibrationManager();
            const mapper = new PitchMapper(calibrationManager);

            const result = mapper.mapToAltitude(null, currentAltitude, deltaTime, canvasHeight);

            // Should descend at most 150 * deltaTime
            const maxDescent = GAME_CONFIG.DESCENT_RATE * deltaTime;
            expect(result).toBeGreaterThanOrEqual(0);
            expect(result).toBeGreaterThanOrEqual(currentAltitude - maxDescent - 0.001);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 5: Altitude Change Smoothing Cap ──────────────────────────────
  describe('Property 5: Altitude Change Smoothing Cap', () => {
    it('altitude change per frame never exceeds 10% of canvas height', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 80, max: 500, noNaN: true }),
          fc.float({ min: 0, max: 1000, noNaN: true }),
          fc.float({ min: 100, max: 2000, noNaN: true }),
          (frequency, currentAltitude, canvasHeight) => {
            const calibrationManager = new CalibrationManager();
            const mapper = new PitchMapper(calibrationManager);

            const result = mapper.mapToAltitude(frequency, currentAltitude, 0.016, canvasHeight);
            const change = Math.abs(result - currentAltitude);
            const maxChange = canvasHeight * GAME_CONFIG.MAX_ALTITUDE_CHANGE_RATIO;

            expect(change).toBeLessThanOrEqual(maxChange + 0.001);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 6: World Scroll Consistency ───────────────────────────────────
  describe('Property 6: World Scroll Consistency', () => {
    it('obstacle x position decreases by SCROLL_SPEED * deltaTime each update', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 100, max: 2000, noNaN: true }),
          fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true }),
          (startX, deltaTime) => {
            const generator = new ObstacleGenerator(() => 0.5);

            const obstacles = [
              { x: startX, gapY: 300, gapHeight: 100, width: 60, passed: false },
            ];

            const updated = generator.update(obstacles, deltaTime, 600, 32, 0);

            // The obstacle that was at startX should now be at startX - SCROLL_SPEED * deltaTime
            // (assuming it didn't get removed by being off-screen)
            if (updated.length > 0 && updated[0] !== undefined && updated[0].gapY === 300) {
              const expectedX = startX - GAME_CONFIG.SCROLL_SPEED * deltaTime;
              expect(updated[0].x).toBeCloseTo(expectedX, 2);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 7: Obstacle Generation Constraints ────────────────────────────
  describe('Property 7: Obstacle Generation Constraints', () => {
    it('generated obstacles satisfy gap height and gap center constraints', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 100, noNaN: true }),
          fc.float({ min: 200, max: 1000, noNaN: true }),
          fc.float({ min: 20, max: 80, noNaN: true }),
          (elapsedTime, canvasHeight, planeHeight) => {
            const generator = new ObstacleGenerator(() => 0.5);

            // Force spawn by setting a high elapsed time for spawn timer
            const spawnInterval = Math.max(
              GAME_CONFIG.MIN_SPAWN_INTERVAL,
              GAME_CONFIG.INITIAL_SPAWN_INTERVAL - GAME_CONFIG.DIFFICULTY_INCREASE_RATE * elapsedTime,
            );

            const obstacles = generator.update([], spawnInterval + 0.01, canvasHeight, planeHeight, elapsedTime);

            // Check spawned obstacles
            for (const obstacle of obstacles) {
              const gapMultiplier = Math.max(
                GAME_CONFIG.MIN_GAP_MULTIPLIER,
                GAME_CONFIG.INITIAL_GAP_MULTIPLIER - GAME_CONFIG.DIFFICULTY_INCREASE_RATE * elapsedTime,
              );

              // (a) gap height >= max(currentGapMultiplier, 1.2) * planeHeight
              const minGapHeight = Math.max(gapMultiplier, 1.2) * planeHeight;
              expect(obstacle.gapHeight).toBeGreaterThanOrEqual(minGapHeight - 0.001);

              // (b) gap center at least one planeHeight from edges
              const minGapY = planeHeight + obstacle.gapHeight / 2;
              const maxGapY = canvasHeight - planeHeight - obstacle.gapHeight / 2;
              if (minGapY < maxGapY) {
                expect(obstacle.gapY).toBeGreaterThanOrEqual(minGapY - 0.001);
                expect(obstacle.gapY).toBeLessThanOrEqual(maxGapY + 0.001);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 9: AABB Collision Detection ───────────────────────────────────
  describe('Property 9: AABB Collision Detection', () => {
    it('reports collision iff plane overlaps obstacle on both axes and is not in gap', () => {
      fc.assert(
        fc.property(
          // Plane AABB
          fc.record({
            x: fc.float({ min: 0, max: 500, noNaN: true }),
            y: fc.float({ min: 0, max: 500, noNaN: true }),
            width: fc.float({ min: 10, max: 100, noNaN: true }),
            height: fc.float({ min: 10, max: 100, noNaN: true }),
          }),
          // Obstacle
          fc.record({
            x: fc.float({ min: 0, max: 500, noNaN: true }),
            gapY: fc.float({ min: 100, max: 400, noNaN: true }),
            gapHeight: fc.float({ min: 50, max: 200, noNaN: true }),
            width: fc.float({ min: 10, max: 100, noNaN: true }),
            passed: fc.boolean(),
          }),
          (plane, obstacle) => {
            const result = checkObstacleCollision(plane, [obstacle]);

            // Manual calculation
            const horizontalOverlap =
              plane.x < obstacle.x + obstacle.width &&
              plane.x + plane.width > obstacle.x;

            const gapTop = obstacle.gapY - obstacle.gapHeight / 2;
            const gapBottom = obstacle.gapY + obstacle.gapHeight / 2;
            const fullyWithinGap =
              plane.y >= gapTop && plane.y + plane.height <= gapBottom;

            const expectedCollision = horizontalOverlap && !fullyWithinGap;

            expect(result).toBe(expectedCollision);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 10: Boundary Violation ────────────────────────────────────────
  describe('Property 10: Boundary Violation', () => {
    it('reports true iff plane is fully outside canvas bounds', () => {
      fc.assert(
        fc.property(
          fc.record({
            x: fc.float({ min: 0, max: 500, noNaN: true }),
            y: fc.float({ min: -200, max: 1000, noNaN: true }),
            width: fc.float({ min: 10, max: 100, noNaN: true }),
            height: fc.float({ min: 10, max: 100, noNaN: true }),
          }),
          fc.float({ min: 100, max: 800, noNaN: true }),
          (plane, canvasHeight) => {
            const result = checkBoundaryViolation(plane, canvasHeight);

            // Manual calculation: fully above OR fully below
            const fullyAbove = plane.y + plane.height < 0;
            const fullyBelow = plane.y > canvasHeight;
            const expected = fullyAbove || fullyBelow;

            expect(result).toBe(expected);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 11: Distance-Based Scoring ────────────────────────────────────
  describe('Property 11: Distance-Based Scoring', () => {
    it('score increments by floor(d / 10) accounting for fractional accumulation', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 200, noNaN: true }), { minLength: 1, maxLength: 20 }),
          (distances) => {
            const tracker = new ScoreTracker();

            let totalDistance = 0;
            for (const d of distances) {
              tracker.addScrollScore(d);
              totalDistance += d;
            }

            // Total score should be floor(totalDistance / 10)
            const expectedScore = Math.floor(totalDistance / 10);
            expect(tracker.getScore()).toBe(expectedScore);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 12: Game State Reset ──────────────────────────────────────────
  describe('Property 12: Game State Reset', () => {
    it('after modifications, ScoreTracker reset restores initial values', () => {
      fc.assert(
        fc.property(
          fc.array(fc.float({ min: 0, max: 500, noNaN: true }), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 100 }),
          (scrollDistances, bonusCount) => {
            const tracker = new ScoreTracker();

            // Modify state
            for (const d of scrollDistances) {
              tracker.addScrollScore(d);
            }
            for (let i = 0; i < bonusCount; i++) {
              tracker.addObstacleBonus();
            }

            // Reset
            tracker.reset();

            expect(tracker.getScore()).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('ObstacleGenerator reset restores initial difficulty', () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.01), max: 5, noNaN: true }),
          fc.float({ min: 200, max: 1000, noNaN: true }),
          (deltaTime, canvasHeight) => {
            const generator = new ObstacleGenerator(() => 0.5);

            // Generate some obstacles
            generator.update([], deltaTime, canvasHeight, 32, 50);

            // Reset
            generator.reset();

            // After reset, calling update with 0 deltaTime should not spawn anything
            // because timeSinceLastSpawn starts at 0
            const result = generator.update([], 0, canvasHeight, 32, 0);
            expect(result).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 14: Calibrated Pitch Mapping ─────────────────────────────────
  describe('Property 14: Calibrated Pitch Mapping', () => {
    it('with calibration {L, H}, maps f in [L, H] to ((f-L)/(H-L)) * canvasHeight', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 80, max: 300, noNaN: true }),
          fc.float({ min: 100, max: 400, noNaN: true }),
          fc.float({ min: 100, max: 2000, noNaN: true }),
          (low, rangeOffset, canvasHeight) => {
            // Ensure H - L >= 100
            const high = low + Math.max(rangeOffset, 100);

            // Save calibration data
            const calibrationManager = new CalibrationManager();
            calibrationManager.saveCalibration({
              lowFrequency: low,
              highFrequency: high,
              timestamp: Date.now(),
            });

            const mapper = new PitchMapper(calibrationManager);

            // Get the effective range (which has 10% buffer)
            const effectiveRange = calibrationManager.getEffectiveRange();
            const rangeWidth = effectiveRange.max - effectiveRange.min;

            // Pick a frequency within the effective range
            const freq = effectiveRange.min + (rangeWidth * 0.5);
            const expectedAltitude = ((freq - effectiveRange.min) / rangeWidth) * canvasHeight;

            // Call with currentAltitude = expectedAltitude so smoothing won't interfere
            const result = mapper.mapToAltitude(freq, expectedAltitude, 0.016, canvasHeight);

            expect(result).toBeCloseTo(expectedAltitude, 1);

            // Clean up
            calibrationManager.clearCalibration();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ─── Property 15: Daily Seed Determinism ────────────────────────────────────
  describe('Property 15: Daily Seed Determinism', () => {
    it('same date string produces identical sequence', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          (year, month, day) => {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            const rng1 = createSeededRNG(dateStr);
            const rng2 = createSeededRNG(dateStr);

            // Generate 20 values and compare
            for (let i = 0; i < 20; i++) {
              expect(rng1()).toBe(rng2());
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('different date strings produce different sequences', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2025 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          fc.integer({ min: 2026, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 }),
          (year1, month1, day1, year2, month2, day2) => {
            const dateStr1 = `${year1}-${String(month1).padStart(2, '0')}-${String(day1).padStart(2, '0')}`;
            const dateStr2 = `${year2}-${String(month2).padStart(2, '0')}-${String(day2).padStart(2, '0')}`;

            // Different year ranges guarantee different strings
            const rng1 = createSeededRNG(dateStr1);
            const rng2 = createSeededRNG(dateStr2);

            // At least one value in the first 10 should differ
            let allSame = true;
            for (let i = 0; i < 10; i++) {
              if (rng1() !== rng2()) {
                allSame = false;
                break;
              }
            }

            expect(allSame).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
