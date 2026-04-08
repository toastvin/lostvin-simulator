export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

export function distanceSquared(
  left: { x: number; y: number },
  right: { x: number; y: number },
): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;

  return dx * dx + dy * dy;
}

export function clampVectorMagnitude(
  vx: number,
  vy: number,
  maxMagnitude: number,
): { vx: number; vy: number } {
  const magnitude = Math.hypot(vx, vy);

  if (magnitude === 0 || magnitude <= maxMagnitude) {
    return { vx, vy };
  }

  const ratio = maxMagnitude / magnitude;

  return {
    vx: vx * ratio,
    vy: vy * ratio,
  };
}
