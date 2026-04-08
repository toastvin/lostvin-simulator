import type {
  ConnectedCanvasDocument,
  ExportConnectedCanvasDocumentResult,
} from "@/types/connected-canvas";

export function exportConnectedCanvasDocument(
  document: ConnectedCanvasDocument,
): ExportConnectedCanvasDocumentResult {
  return {
    json: JSON.stringify(document, null, 2),
    filename: `connected-policy-canvas-v${document.version}.json`,
  };
}
