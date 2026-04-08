import type { CanvasViewport } from "@/types/composer-canvas";
import type {
  ComposerBlock,
  ComposerBlockCategory,
  ComposerCadence,
  ComposerDocument,
  ComposerRule,
} from "@/types/composer";

export type ConnectedCanvasVersion = 1;

export type ConnectedCanvasConnectionType = ComposerBlockCategory;

export type ConnectedCanvasNodeKind =
  | "rule-frame"
  | "target-block"
  | "condition-block"
  | "effect-block"
  | "modifier-block"
  | "condition-group"
  | "effect-group"
  | "modifier-group";

export type ConnectedCanvasBlockNodeKind =
  | "target-block"
  | "condition-block"
  | "effect-block"
  | "modifier-block";

export type ConnectedCanvasGroupNodeKind =
  | "condition-group"
  | "effect-group"
  | "modifier-group";

export type ConnectedCanvasPortDirection = "input" | "output";

export type ConnectedCanvasPort = {
  id: string;
  nodeId: string;
  key: string;
  direction: ConnectedCanvasPortDirection;
  accepts: ConnectedCanvasConnectionType[];
  provides: ConnectedCanvasConnectionType[];
  maxConnections: 1 | "many";
};

export type ConnectedCanvasRuleFrameNode = {
  id: string;
  kind: "rule-frame";
  ruleId: string;
  name: string;
  enabled: boolean;
  cadence: ComposerCadence;
};

export type ConnectedCanvasBlockNode<
  TBlock extends ComposerBlock = ComposerBlock,
> = {
  id: string;
  kind: ConnectedCanvasBlockNodeKind;
  ruleId: string;
  category: TBlock["category"];
  block: TBlock;
};

export type ConnectedCanvasGroupNode = {
  id: string;
  kind: ConnectedCanvasGroupNodeKind;
  ruleId: string;
  category: Exclude<ComposerBlockCategory, "target">;
  label: string;
  collapsed: boolean;
};

export type ConnectedCanvasNode =
  | ConnectedCanvasRuleFrameNode
  | ConnectedCanvasBlockNode
  | ConnectedCanvasGroupNode;

export type ConnectedCanvasEdge = {
  id: string;
  fromPortId: string;
  toPortId: string;
};

export type ConnectedCanvasNodeLayout = {
  nodeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type ConnectedCanvasContainerChildOrder = {
  containerNodeId: string;
  childNodeIds: string[];
};

export type ConnectedCanvasDocument = {
  version: ConnectedCanvasVersion;
  viewport: CanvasViewport;
  nodes: ConnectedCanvasNode[];
  ports: ConnectedCanvasPort[];
  edges: ConnectedCanvasEdge[];
  layouts: ConnectedCanvasNodeLayout[];
  containers: ConnectedCanvasContainerChildOrder[];
};

export type ConnectedCanvasIssueCode =
  | "duplicate_node_id"
  | "duplicate_port_id"
  | "duplicate_edge_id"
  | "duplicate_layout"
  | "duplicate_container"
  | "missing_layout"
  | "layout_rebuilt"
  | "missing_container"
  | "container_order_rebuilt"
  | "orphan_edge"
  | "missing_node"
  | "missing_port"
  | "invalid_edge_direction"
  | "type_mismatch"
  | "too_many_connections"
  | "missing_target_connection"
  | "missing_effect_connection"
  | "cross_frame_connection"
  | "invalid_container_child"
  | "duplicate_container_child"
  | "cycle_detected"
  | "orphan_node"
  | "disconnected_rule_frame";

export type ConnectedCanvasIssue = {
  severity: "warning" | "error";
  code: ConnectedCanvasIssueCode;
  message: string;
  nodeId?: string;
  edgeId?: string;
  containerNodeId?: string;
  portId?: string;
  ruleId?: string;
};

export type NormalizeConnectedCanvasDocumentResult = {
  document: ConnectedCanvasDocument;
  issues: ConnectedCanvasIssue[];
};

export type ValidateConnectedCanvasDocumentResult = {
  valid: boolean;
  errors: ConnectedCanvasIssue[];
  warnings: ConnectedCanvasIssue[];
};

export type DeriveComposerFromConnectedCanvasResult = {
  composer: ComposerDocument;
  issues: ConnectedCanvasIssue[];
};

export type ImportPhase10CanvasToConnectedCanvasResult = {
  document: ConnectedCanvasDocument;
  issues: ConnectedCanvasIssue[];
};

export type ExportConnectedCanvasDocumentResult = {
  json: string;
  filename: string;
};

export type ConnectedCanvasSelection = {
  nodeId: string | null;
  edgeId: string | null;
  portId: string | null;
};

export type ConnectedCanvasRuleFrameSeed = Pick<
  ComposerRule,
  "id" | "name" | "enabled" | "cadence"
>;
