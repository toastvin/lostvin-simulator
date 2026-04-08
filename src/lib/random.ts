export type SeededRandom = {
  next: () => number;
};

export function createSeededRandom(seed: number): SeededRandom {
  let state = (seed >>> 0) || 0x9e3779b9;

  return {
    next: () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;

      return ((state >>> 0) / 4294967296);
    },
  };
}

export function randomBetween(
  random: SeededRandom,
  min: number,
  max: number,
): number {
  return min + (max - min) * random.next();
}

export function randomInt(
  random: SeededRandom,
  min: number,
  max: number,
): number {
  return Math.floor(randomBetween(random, min, max + 1));
}

export function boxMuller(
  random: SeededRandom,
  mean = 0,
  standardDeviation = 1,
): number {
  const u1 = 1 - random.next();
  const u2 = 1 - random.next();
  const z0 =
    Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

  return z0 * standardDeviation + mean;
}
