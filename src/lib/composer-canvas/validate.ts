import { normalizeCanvasDocument } from "@/lib/composer-canvas/normalize";
import type {
  ComposerCanvasDocument,
  ValidateCanvasDocumentResult,
} from "@/types/composer-canvas";

export function validateCanvasDocument(
  document: ComposerCanvasDocument,
): ValidateCanvasDocumentResult {
  const normalized = normalizeCanvasDocument(document);
  const errors = normalized.issues.filter((issue) => issue.severity === "error");
  const warnings = normalized.issues.filter(
    (issue) => issue.severity === "warning",
  );

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
