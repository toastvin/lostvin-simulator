import type {
  ComposerCanvasDocument,
  ExportCanvasDocumentResult,
} from "@/types/composer-canvas";

export function exportCanvasDocument(
  document: ComposerCanvasDocument,
): ExportCanvasDocumentResult {
  return {
    json: JSON.stringify(document, null, 2),
    filename: `scratch-policy-canvas-v${document.version}.json`,
  };
}
