export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getAtPath(input: unknown, path: string): unknown {
  if (!isRecord(input)) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, segment) => {
    if (!isRecord(current)) {
      return undefined;
    }

    return current[segment];
  }, input);
}

export function setAtPath(
  input: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const segments = path.split(".");
  let cursor: Record<string, unknown> = input;

  segments.forEach((segment, index) => {
    const isLeaf = index === segments.length - 1;

    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    const nextValue = cursor[segment];
    if (!isRecord(nextValue)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  });

  return input;
}
