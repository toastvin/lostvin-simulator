import { describe, expect, it } from "vitest";

import { boxMuller, createSeededRandom } from "@/lib/random";

describe("seeded random", () => {
  it("produces the same sequence for the same seed", () => {
    const left = createSeededRandom(42);
    const right = createSeededRandom(42);

    expect(Array.from({ length: 5 }, () => left.next())).toEqual(
      Array.from({ length: 5 }, () => right.next()),
    );
  });

  it("produces a different sequence for a different seed", () => {
    const left = createSeededRandom(42);
    const right = createSeededRandom(84);

    expect(Array.from({ length: 5 }, () => left.next())).not.toEqual(
      Array.from({ length: 5 }, () => right.next()),
    );
  });

  it("supports deterministic Box-Muller output", () => {
    const left = createSeededRandom(777);
    const right = createSeededRandom(777);

    expect(boxMuller(left, 0.5, 0.15)).toBe(boxMuller(right, 0.5, 0.15));
  });
});
