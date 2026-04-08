import type {
  ComposerBlockType,
  ComposerDocument,
  ComposerSelection,
} from "@/types/composer";

export type ComposerCanvasVersion = 1;

export const composerCanvasLanes = [
  "target",
  "condition",
  "effect",
  "modifier",
] as const;

export type ComposerCanvasLane = (typeof composerCanvasLanes)[number];

export type CanvasPoint = {
  x: number;
  y: number;
};

export type CanvasRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CanvasViewport = {
  x: number;
  y: number;
  zoom: number;
};

export type CanvasRuleFrame = {
  id: string;
  ruleId: string;
  x: number;
  y: number;
  width: number;
  collapsed: boolean;
  zIndex: number;
  laneOrder: Record<ComposerCanvasLane, string[]>;
};

export type CanvasBlockLayout = {
  blockId: string;
  ruleId: string;
  lane: ComposerCanvasLane;
};

export type ComposerCanvasDocument = {
  version: ComposerCanvasVersion;
  viewport: CanvasViewport;
  composer: ComposerDocument;
  frames: CanvasRuleFrame[];
  blockLayouts: CanvasBlockLayout[];
};

export type ComposerCanvasPanelTab =
  | "palette"
  | "inspector"
  | "astPreview"
  | "compiledPreview"
  | "validation";

export type CanvasSelection = ComposerSelection & {
  frameId: string | null;
  lane: ComposerCanvasLane | null;
};

export type CanvasDragType =
  | "palette-block"
  | "canvas-block"
  | "rule-frame";

export type CanvasDropTarget =
  | {
      kind: "frame";
      frameId: string;
    }
  | {
      kind: "lane";
      frameId: string;
      ruleId: string;
      lane: ComposerCanvasLane;
      index: number;
    }
  | {
      kind: "trash";
    };

export type CanvasDragState = {
  type: CanvasDragType | null;
  sourceBlockType: ComposerBlockType | null;
  sourceBlockId: string | null;
  sourceRuleId: string | null;
  sourceFrameId: string | null;
  originClient: CanvasPoint | null;
  currentClient: CanvasPoint | null;
  dropTarget: CanvasDropTarget | null;
  active: boolean;
};

export type ComposerCanvasUiState = {
  activeTab: ComposerCanvasPanelTab;
  mobilePaletteOpen: boolean;
  mobileInspectorOpen: boolean;
  previewCollapsed: boolean;
  dragging: CanvasDragState;
};

export type CanvasNormalizationIssueCode =
  | "missing_frame"
  | "missing_rule"
  | "missing_block_layout"
  | "duplicate_frame_id"
  | "duplicate_rule_binding"
  | "invalid_lane"
  | "orphan_block"
  | "frame_order_rebuilt";

export type CanvasNormalizationIssue = {
  severity: "warning" | "error";
  code: CanvasNormalizationIssueCode;
  message: string;
  frameId?: string;
  ruleId?: string;
  blockId?: string;
};

export type NormalizeCanvasDocumentResult = {
  document: ComposerCanvasDocument;
  issues: CanvasNormalizationIssue[];
};

export type ValidateCanvasDocumentResult = {
  valid: boolean;
  errors: CanvasNormalizationIssue[];
  warnings: CanvasNormalizationIssue[];
};

export type DeriveComposerFromCanvasResult = {
  composer: ComposerDocument;
  issues: CanvasNormalizationIssue[];
};

export type ImportComposerToCanvasResult = {
  document: ComposerCanvasDocument;
  issues: CanvasNormalizationIssue[];
};

export type ExportCanvasDocumentResult = {
  json: string;
  filename: string;
};
