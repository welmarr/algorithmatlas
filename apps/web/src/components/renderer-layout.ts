import type { VisualEntity } from "@sim/domain";

export interface Point {
  x: number;
  y: number;
}
export interface TreeLayout {
  positions: Map<string, Point>;
  edges: { from: string; to: string }[];
  width: number;
  height: number;
}

/** Deterministic tidy-tree layout: leaves get slots, parents are centered above children. */
export function layoutTree(nodes: readonly VisualEntity[]): TreeLayout {
  const byLabel = new Map(nodes.map((node) => [node.label, node]));
  const children = new Map(nodes.map((node) => [node.label, [] as string[]]));
  const roots: string[] = [];
  const edges: TreeLayout["edges"] = [];
  for (const node of nodes) {
    const parent = node.metadata?.parent;
    if (
      typeof parent === "string" &&
      parent !== node.label &&
      byLabel.has(parent)
    ) {
      children.get(parent)!.push(node.label);
      edges.push({ from: parent, to: node.label });
    } else roots.push(node.label);
  }
  const positions = new Map<string, Point>();
  const visited = new Set<string>();
  let leaf = 0;
  let deepest = 0;
  const place = (label: string, depth: number): number => {
    if (visited.has(label)) return positions.get(label)?.x ?? 0;
    visited.add(label);
    deepest = Math.max(deepest, depth);
    const childXs = children
      .get(label)!
      .filter((child) => !visited.has(child))
      .map((child) => place(child, depth + 1));
    const x = childXs.length
      ? (childXs[0] + childXs.at(-1)!) / 2
      : 65 + leaf++ * 100;
    positions.set(label, { x, y: 55 + depth * 110 });
    return x;
  };
  for (const root of roots) place(root, 0);
  for (const node of nodes) if (!visited.has(node.label)) place(node.label, 0);
  return {
    positions,
    edges: edges.filter(
      ({ from, to }) => positions.has(from) && positions.has(to),
    ),
    width: Math.max(600, 130 + Math.max(0, leaf - 1) * 100),
    height: Math.max(300, 120 + deepest * 110),
  };
}

export interface DpLayout {
  rows: (VisualEntity | undefined)[][];
  columnCount: number;
  rowCount: number;
  twoDimensional: boolean;
}

export function layoutDp(cells: readonly VisualEntity[]): DpLayout {
  const coordinates = cells.map((cell, index) => {
    const match = /^dp:(\d+):(\d+)$/.exec(cell.id);
    const row =
      typeof cell.metadata?.row === "number"
        ? cell.metadata.row
        : match
          ? Number(match[1])
          : 0;
    const col =
      typeof cell.metadata?.col === "number"
        ? cell.metadata.col
        : match
          ? Number(match[2])
          : Number(cell.label) || index;
    return { cell, row, col };
  });
  const rowCount = Math.max(1, ...coordinates.map((item) => item.row + 1));
  const columnCount = Math.max(1, ...coordinates.map((item) => item.col + 1));
  const rows = Array.from({ length: rowCount }, () =>
    Array<VisualEntity | undefined>(columnCount).fill(undefined),
  );
  for (const { cell, row, col } of coordinates)
    if (
      Number.isSafeInteger(row) &&
      Number.isSafeInteger(col) &&
      row >= 0 &&
      col >= 0 &&
      row < rowCount &&
      col < columnCount
    )
      rows[row][col] = cell;
  return { rows, rowCount, columnCount, twoDimensional: rowCount > 1 };
}
