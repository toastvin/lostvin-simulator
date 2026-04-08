import { deriveSimulationGridLayout } from "./grid";

export const LEGACY_BASELINE_EVENT_NODE_COUNT = 200;
export const DEFAULT_EVENT_GRID_RING_COUNT = 5;

function chooseBaseRectangle(
  fullColumns: number,
  fullRows: number,
) {
  const wider = fullColumns >= fullRows;
  const smallerSpan = wider ? fullRows : fullColumns;
  const spanDifference = Math.abs(fullColumns - fullRows);
  const minimumSmallerBase = smallerSpan % 2 === 0 ? 2 : 1;
  let bestBaseSmaller = minimumSmallerBase;
  let bestScore = Number.POSITIVE_INFINITY;

  for (
    let candidateSmaller = minimumSmallerBase;
    candidateSmaller <= smallerSpan;
    candidateSmaller += 2
  ) {
    const maxRingCount = (smallerSpan - candidateSmaller) / 2;

    if (maxRingCount < DEFAULT_EVENT_GRID_RING_COUNT) {
      continue;
    }

    const defaultColumns =
      (wider ? candidateSmaller + spanDifference : candidateSmaller) +
      DEFAULT_EVENT_GRID_RING_COUNT * 2;
    const defaultRows =
      (wider ? candidateSmaller : candidateSmaller + spanDifference) +
      DEFAULT_EVENT_GRID_RING_COUNT * 2;
    const score = Math.abs(
      defaultColumns * defaultRows - LEGACY_BASELINE_EVENT_NODE_COUNT,
    );

    if (score < bestScore) {
      bestScore = score;
      bestBaseSmaller = candidateSmaller;
    }
  }

  const baseColumns = wider
    ? bestBaseSmaller + spanDifference
    : bestBaseSmaller;
  const baseRows = wider
    ? bestBaseSmaller
    : bestBaseSmaller + spanDifference;

  return {
    baseColumns,
    baseRows,
  };
}

export function deriveEventGridDimensions(
  width: number,
  height: number,
  gridRingCount: number,
) {
  const layout = deriveSimulationGridLayout(width, height);
  const { baseColumns, baseRows } = chooseBaseRectangle(
    layout.columns,
    layout.rows,
  );
  const maxGridRingCount = Math.max(
    0,
    Math.min(
      Math.floor((layout.columns - baseColumns) / 2),
      Math.floor((layout.rows - baseRows) / 2),
    ),
  );
  const boundedGridRingCount = Math.max(
    0,
    Math.min(Math.round(gridRingCount), maxGridRingCount),
  );
  const columns = baseColumns + boundedGridRingCount * 2;
  const rows = baseRows + boundedGridRingCount * 2;

  return {
    availableColumns: layout.columns,
    availableRows: layout.rows,
    cellWidth: layout.cellWidth,
    cellHeight: layout.cellHeight,
    baseColumns,
    baseRows,
    columns,
    rows,
    gridRingCount: boundedGridRingCount,
    maxGridRingCount,
    totalNodeCount: columns * rows,
  };
}

export function buildEventGridSlots(
  width: number,
  height: number,
  gridRingCount: number,
): Array<{ x: number; y: number }> {
  const layout = deriveEventGridDimensions(width, height, gridRingCount);
  const startColumn = Math.max(
    0,
    Math.floor((layout.availableColumns - layout.columns) / 2),
  );
  const startRow = Math.max(
    0,
    Math.floor((layout.availableRows - layout.rows) / 2),
  );
  const slots: Array<{ x: number; y: number }> = [];

  for (let row = 0; row < layout.rows; row += 1) {
    for (let column = 0; column < layout.columns; column += 1) {
      slots.push({
        x: (startColumn + column + 0.5) * layout.cellWidth,
        y: (startRow + row + 0.5) * layout.cellHeight,
      });
    }
  }

  return slots;
}

export function deriveEventCounts(
  luckSharePercent: number,
  totalNodeCount = LEGACY_BASELINE_EVENT_NODE_COUNT,
) {
  const boundedLuckSharePercent = Math.min(Math.max(luckSharePercent, 0), 100);
  const luckNodeCount = Math.round(
    (totalNodeCount * boundedLuckSharePercent) / 100,
  );

  return {
    totalNodeCount,
    luckNodeCount,
    badLuckNodeCount: Math.max(0, totalNodeCount - luckNodeCount),
  };
}
