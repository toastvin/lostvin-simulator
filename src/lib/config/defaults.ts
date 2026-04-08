import {
  type ConfigFieldDefinition,
  type SimulationConfig,
} from "@/types/config";

import { setAtPath } from "./path";

export function createDefaultConfig(
  definitions: ConfigFieldDefinition[],
  schemaVersion: number,
): SimulationConfig {
  const root: Record<string, unknown> = {
    schemaVersion,
  };

  definitions
    .filter((field) => field.scope === "simulation")
    .forEach((field) => {
      setAtPath(root, field.targetPath, field.defaultValue);
    });

  return root as SimulationConfig;
}
