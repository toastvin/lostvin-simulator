export type SimulationStatus = "idle" | "running" | "paused";

export type Agent = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  talent: number;
  wealth: number;
  happiness: number;
  lastWealthDelta: number;
  bankruptCount: number;
  rescuedCount: number;
};

export type EventNode = {
  id: number;
  kind: "luck" | "badLuck";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
};

export type SimulationRuntimeState = {
  step: number;
  agents: Agent[];
  events: EventNode[];
  lastPolicyCost: number;
};
