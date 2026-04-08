import type { ConnectedCanvasDocument } from "@/types/connected-canvas";

export const CONNECTED_CANVAS_STORAGE_KEY =
  "social-policy-lab:connected-canvas-draft:v1";

export type ImportConnectedCanvasJsonResult =
  | {
      ok: true;
      document: ConnectedCanvasDocument;
    }
  | {
      ok: false;
      error: string;
    };

function isConnectedCanvasDocument(
  value: unknown,
): value is ConnectedCanvasDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.version === 1 &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.ports) &&
    Array.isArray(candidate.edges) &&
    Array.isArray(candidate.layouts) &&
    Array.isArray(candidate.containers) &&
    candidate.viewport !== null &&
    typeof candidate.viewport === "object"
  );
}

export function importConnectedCanvasJson(
  json: string,
): ImportConnectedCanvasJsonResult {
  try {
    const parsed = JSON.parse(json) as unknown;

    if (!isConnectedCanvasDocument(parsed)) {
      return {
        ok: false,
        error:
          "The imported JSON is not a valid connected canvas document for version 1.",
      };
    }

    return {
      ok: true,
      document: structuredClone(parsed),
    };
  } catch {
    return {
      ok: false,
      error: "The connected canvas JSON could not be parsed.",
    };
  }
}
