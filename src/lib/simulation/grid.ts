export const SIMULATION_BACKDROP_GRID_SIZE = 36;

export type SimulationGridLayout = {
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
};

const GRID_SEARCH_RADIUS = 12;

export function deriveSimulationGridLayout(
  width: number,
  height: number,
): SimulationGridLayout {
  const boundedWidth = Math.max(width, 1);
  const boundedHeight = Math.max(height, 1);
  const roughRows = Math.max(
    1,
    Math.round(boundedHeight / SIMULATION_BACKDROP_GRID_SIZE),
  );

  let bestLayout: SimulationGridLayout | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (
    let candidateRows = Math.max(1, roughRows - GRID_SEARCH_RADIUS);
    candidateRows <= roughRows + GRID_SEARCH_RADIUS;
    candidateRows += 1
  ) {
    const candidateCellHeight = boundedHeight / candidateRows;
    const candidateColumns = Math.max(
      1,
      Math.round(boundedWidth / candidateCellHeight),
    );
    const candidateCellWidth = boundedWidth / candidateColumns;
    const squareError = Math.abs(candidateCellWidth - candidateCellHeight);
    const sizeError =
      Math.abs(candidateCellWidth - SIMULATION_BACKDROP_GRID_SIZE) +
      Math.abs(candidateCellHeight - SIMULATION_BACKDROP_GRID_SIZE);
    const ratioError = Math.abs(
      candidateColumns / candidateRows - boundedWidth / boundedHeight,
    );
    const score = squareError * 6 + sizeError + ratioError * 48;

    if (score < bestScore) {
      bestScore = score;
      bestLayout = {
        columns: candidateColumns,
        rows: candidateRows,
        cellWidth: candidateCellWidth,
        cellHeight: candidateCellHeight,
      };
    }
  }

  return bestLayout ?? {
    columns: 1,
    rows: 1,
    cellWidth: boundedWidth,
    cellHeight: boundedHeight,
  };
}
