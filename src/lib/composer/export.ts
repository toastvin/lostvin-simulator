import type { ComposerDocument, ExportComposerResult } from "@/types/composer";

export function exportComposerDocument(
  document: ComposerDocument,
): ExportComposerResult {
  return {
    json: JSON.stringify(document, null, 2),
    filename: `visual-policy-composer-v${document.version}.json`,
  };
}
