import { composerCanvasLanes } from "@/types/composer-canvas";
import type {
  CanvasPoint,
  ComposerCanvasDocument,
  ComposerCanvasLane,
} from "@/types/composer-canvas";

const FRAME_MIN_WIDTH = 300;
const FRAME_MAX_WIDTH = 760;
const FRAME_ESTIMATE_BASE_HEIGHT = 136;
const FRAME_ESTIMATE_EMPTY_LANE_HEIGHT = 84;
const FRAME_ESTIMATE_BLOCK_HEIGHT = 72;
const SNAP_GRID_SIZE = 20;
const SNAP_THRESHOLD = 16;
const WORLD_PADDING = 140;

export type FrameMetric = {
  id: string;
  ruleId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  right: number;
  bottom: number;
};

export type SnapGuideSet = {
  vertical: number[];
  horizontal: number[];
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundToGrid(value: number) {
  return Math.round(value / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
}

function estimateFrameHeight(frame: Pick<FrameMetric, "id"> & {
  laneOrder: Record<ComposerCanvasLane, string[]>;
}) {
  return (
    FRAME_ESTIMATE_BASE_HEIGHT +
    composerCanvasLanes.reduce((total, lane) => {
      const count = frame.laneOrder[lane].length;

      return (
        total +
        (count === 0
          ? FRAME_ESTIMATE_EMPTY_LANE_HEIGHT
          : count * FRAME_ESTIMATE_BLOCK_HEIGHT + 52)
      );
    }, 0)
  );
}

function pickBestSnap(
  rawValue: number,
  candidates: Array<{ snapped: number; guide: number }>,
): { snapped: number; guide: number; delta: number } | null {
  let best: { snapped: number; guide: number; delta: number } | null = null;

  candidates.forEach((candidate) => {
    const delta = Math.abs(candidate.snapped - rawValue);

    if (delta > SNAP_THRESHOLD) {
      return;
    }

    if (!best || delta < best.delta) {
      best = {
        ...candidate,
        delta,
      };
    }
  });

  return best;
}

export function buildFrameMetrics(
  document: ComposerCanvasDocument,
  framePreview: Record<string, CanvasPoint>,
  frameWidthPreview: Record<string, number>,
): FrameMetric[] {
  return document.frames.map((frame) => {
    const x = framePreview[frame.id]?.x ?? frame.x;
    const y = framePreview[frame.id]?.y ?? frame.y;
    const width = frameWidthPreview[frame.id] ?? frame.width;
    const height = estimateFrameHeight(frame);

    return {
      id: frame.id,
      ruleId: frame.ruleId,
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      right: x + width,
      bottom: y + height,
    };
  });
}

export function getSnappedFramePosition(
  current: FrameMetric,
  others: FrameMetric[],
  rawPoint: CanvasPoint,
): {
  point: CanvasPoint;
  guides: SnapGuideSet;
} {
  const verticalCandidates = [
    {
      snapped: roundToGrid(rawPoint.x),
      guide: roundToGrid(rawPoint.x),
    },
    ...others.flatMap((other) => [
      { snapped: other.x, guide: other.x },
      { snapped: other.centerX - current.width / 2, guide: other.centerX },
      { snapped: other.right - current.width, guide: other.right },
    ]),
  ];
  const horizontalCandidates = [
    {
      snapped: roundToGrid(rawPoint.y),
      guide: roundToGrid(rawPoint.y),
    },
    ...others.flatMap((other) => [
      { snapped: other.y, guide: other.y },
      { snapped: other.bottom - current.height, guide: other.bottom },
    ]),
  ];
  const snapX = pickBestSnap(rawPoint.x, verticalCandidates);
  const snapY = pickBestSnap(rawPoint.y, horizontalCandidates);

  return {
    point: {
      x: snapX?.snapped ?? rawPoint.x,
      y: snapY?.snapped ?? rawPoint.y,
    },
    guides: {
      vertical: snapX ? [snapX.guide] : [],
      horizontal: snapY ? [snapY.guide] : [],
    },
  };
}

export function getSnappedFrameWidth(
  current: FrameMetric,
  others: FrameMetric[],
  rawWidth: number,
): {
  width: number;
  guides: SnapGuideSet;
} {
  const rawRight = current.x + rawWidth;
  const rightCandidates = [
    {
      snapped: current.x + roundToGrid(rawWidth),
      guide: current.x + roundToGrid(rawWidth),
    },
    ...others.flatMap((other) => [
      { snapped: other.x, guide: other.x },
      { snapped: other.centerX, guide: other.centerX },
      { snapped: other.right, guide: other.right },
    ]),
  ];
  const snapRight = pickBestSnap(rawRight, rightCandidates);
  const nextWidth = clamp(
    (snapRight?.snapped ?? rawRight) - current.x,
    FRAME_MIN_WIDTH,
    FRAME_MAX_WIDTH,
  );

  return {
    width: nextWidth,
    guides: {
      vertical: snapRight ? [snapRight.guide] : [],
      horizontal: [],
    },
  };
}

export function getWorldBounds(metrics: FrameMetric[]) {
  if (metrics.length === 0) {
    return {
      minX: -WORLD_PADDING,
      minY: -WORLD_PADDING,
      width: WORLD_PADDING * 2 + 960,
      height: WORLD_PADDING * 2 + 640,
    };
  }

  const minX = Math.min(...metrics.map((metric) => metric.x)) - WORLD_PADDING;
  const minY = Math.min(...metrics.map((metric) => metric.y)) - WORLD_PADDING;
  const maxX = Math.max(...metrics.map((metric) => metric.right)) + WORLD_PADDING;
  const maxY = Math.max(...metrics.map((metric) => metric.bottom)) + WORLD_PADDING;

  return {
    minX,
    minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function createTidiedFramePositions(
  metrics: FrameMetric[],
  startX: number,
  startY: number,
  viewportWidth: number,
) {
  if (metrics.length === 0) {
    return new Map<string, CanvasPoint>();
  }

  const sorted = [...metrics].sort((left, right) =>
    left.y === right.y ? left.x - right.x : left.y - right.y,
  );
  const widestFrame = Math.max(...sorted.map((metric) => metric.width));
  const horizontalGap = 56;
  const verticalGap = 64;
  const estimatedColumns = Math.max(
    1,
    Math.min(
      3,
      Math.floor(
        (Math.max(viewportWidth, widestFrame) + horizontalGap) /
          (widestFrame + horizontalGap),
      ),
    ),
  );
  const positions = new Map<string, CanvasPoint>();
  const rowHeights: number[] = [];

  sorted.forEach((metric, index) => {
    const column = index % estimatedColumns;
    const row = Math.floor(index / estimatedColumns);
    const rowY =
      row === 0
        ? startY
        : startY +
          rowHeights
            .slice(0, row)
            .reduce((sum, value) => sum + value + verticalGap, 0);

    positions.set(metric.id, {
      x: startX + column * (widestFrame + horizontalGap),
      y: rowY,
    });

    rowHeights[row] = Math.max(rowHeights[row] ?? 0, metric.height);
  });

  return positions;
}

export function createDistributedFramePositions(
  metrics: FrameMetric[],
  startX: number,
  baselineY: number,
  viewportWidth: number,
) {
  const sorted = [...metrics].sort((left, right) => left.x - right.x);
  const positions = new Map<string, CanvasPoint>();

  if (sorted.length === 0) {
    return positions;
  }

  if (sorted.length === 1) {
    positions.set(sorted[0].id, {
      x: startX,
      y: baselineY,
    });
    return positions;
  }

  const totalWidth = sorted.reduce((sum, metric) => sum + metric.width, 0);
  const availableWidth = Math.max(
    viewportWidth - 80,
    totalWidth + (sorted.length - 1) * 56,
  );
  const gap = Math.max(40, (availableWidth - totalWidth) / (sorted.length - 1));
  let currentX = startX;

  sorted.forEach((metric) => {
    positions.set(metric.id, {
      x: currentX,
      y: baselineY,
    });
    currentX += metric.width + gap;
  });

  return positions;
}
