import type { AABB, Obstacle } from './types';

/**
 * Check if the plane AABB collides with any obstacle.
 *
 * An obstacle is two solid columns (top and bottom) with a gap in the middle.
 * Collision occurs when the plane overlaps the obstacle horizontally AND
 * is NOT fully within the gap vertically.
 */
export function checkObstacleCollision(plane: AABB, obstacles: Obstacle[]): boolean {
  for (const obstacle of obstacles) {
    // Check horizontal overlap first (early exit if no overlap)
    const horizontalOverlap =
      plane.x < obstacle.x + obstacle.width &&
      plane.x + plane.width > obstacle.x;

    if (!horizontalOverlap) {
      continue;
    }

    // Calculate gap boundaries
    const gapTop = obstacle.gapY - obstacle.gapHeight / 2;
    const gapBottom = obstacle.gapY + obstacle.gapHeight / 2;

    // Plane is safe only if it's fully within the gap
    const fullyWithinGap =
      plane.y >= gapTop && plane.y + plane.height <= gapBottom;

    if (!fullyWithinGap) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the plane has fully left the canvas boundaries.
 *
 * Returns true if the plane is entirely above the top edge
 * or entirely below the bottom edge of the canvas.
 */
export function checkBoundaryViolation(plane: AABB, canvasHeight: number): boolean {
  // Fully above the top (bottom edge of plane is above y=0)
  if (plane.y + plane.height < 0) {
    return true;
  }

  // Fully below the bottom (top edge of plane is below canvas bottom)
  if (plane.y > canvasHeight) {
    return true;
  }

  return false;
}
