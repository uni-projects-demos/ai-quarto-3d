import { type BufferGeometry, CircleGeometry, LatheGeometry, Vector2 } from "three";
import { createTrunkTable, weldTrunkEdge } from "./natureTable";

export interface TableGeometries {
  regularTop: CircleGeometry;
  regularEdge: LatheGeometry;
  natureTop: BufferGeometry;
  natureEdge: BufferGeometry;
}

export function createTableGeometries(
  TABLE_RADIUS: number,
  TABLE_BEVEL: number,
  TABLE_THICKNESS: number,
): TableGeometries {
  const topRadius: number = TABLE_RADIUS - TABLE_BEVEL;
  const topGeometry = new CircleGeometry(topRadius, 120);

  const edgeGeometry = new LatheGeometry(
    [
      new Vector2(topRadius, -TABLE_THICKNESS),
      new Vector2(TABLE_RADIUS - 0.02, -TABLE_THICKNESS + 0.005),
      new Vector2(TABLE_RADIUS, -TABLE_THICKNESS + 0.025),
      new Vector2(TABLE_RADIUS, -0.045),
      new Vector2(TABLE_RADIUS - 0.015, -0.02),
      new Vector2(TABLE_RADIUS - 0.035, -0.005),
      new Vector2(topRadius, 0),
    ],
    120,
  );
  const edgePositions = edgeGeometry.getAttribute("position");
  const edgeUVs = edgeGeometry.getAttribute("uv");
  for (let vertex: number = 0; vertex < edgePositions.count; vertex += 1) {
    edgeUVs.setXY(
      vertex,
      0.5 + edgePositions.getX(vertex) / (2 * topRadius),
      0.5 - edgePositions.getZ(vertex) / (2 * topRadius),
    );
  }
  const trunk = createTrunkTable(TABLE_RADIUS, TABLE_BEVEL);
  return {
    regularTop: topGeometry,
    regularEdge: edgeGeometry,
    natureTop: trunk.top,
    natureEdge: trunk.edge,
  };
}

export function lowerTableRear(tableGeometries: TableGeometries, TABLE_REAR_SCALE: number): void {
  for (const [geometry, flat] of [
    [tableGeometries.regularTop, true],
    [tableGeometries.regularEdge, false],
    [tableGeometries.natureTop, true],
    [tableGeometries.natureEdge, false],
  ] as const) {
    const pos = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let idx = 0; idx < pos.count; idx += 1) {
      const rear: number = flat ? pos.getY(idx) : -pos.getZ(idx);
      if (rear <= 0) continue;
      if (flat) pos.setY(idx, rear * TABLE_REAR_SCALE);
      else pos.setZ(idx, -rear * TABLE_REAR_SCALE);
      if (flat || geometry === tableGeometries.regularEdge) {
        uv.setY(idx, 0.5 + (uv.getY(idx) - 0.5) * TABLE_REAR_SCALE);
      }
    }
    geometry.computeVertexNormals();
    if (geometry === tableGeometries.natureEdge && geometry instanceof LatheGeometry)
      weldTrunkEdge(geometry);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  }
}
