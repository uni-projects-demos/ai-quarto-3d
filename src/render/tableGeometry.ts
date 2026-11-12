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
  const topRad: number = TABLE_RADIUS - TABLE_BEVEL;
  const topGeometry = new CircleGeometry(topRad, 120);

  const edgeGeometry = new LatheGeometry(
    [
      new Vector2(topRad, -TABLE_THICKNESS),
      new Vector2(TABLE_RADIUS - 0.02, -TABLE_THICKNESS + 0.005),
      new Vector2(TABLE_RADIUS, -TABLE_THICKNESS + 0.025),
      new Vector2(TABLE_RADIUS, -0.045),
      new Vector2(TABLE_RADIUS - 0.015, -0.02),
      new Vector2(TABLE_RADIUS - 0.035, -0.005),
      new Vector2(topRad, 0),
    ],
    120,
  );
  const edgePositions = edgeGeometry.getAttribute("position");
  const edgeUVs = edgeGeometry.getAttribute("uv");
  for (let vtx: number = 0; vtx < edgePositions.count; vtx += 1) {
    edgeUVs.setXY(
      vtx,
      0.5 + edgePositions.getX(vtx) / (2 * topRad),
      0.5 - edgePositions.getZ(vtx) / (2 * topRad),
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

export function lowerTableRear(tableGeoms: TableGeometries, TABLE_REAR_SCALE: number): void {
  for (const [geom, flat] of [
    [tableGeoms.regularTop, true],
    [tableGeoms.regularEdge, false],
    [tableGeoms.natureTop, true],
    [tableGeoms.natureEdge, false],
  ] as const) {
    const pos = geom.getAttribute("position");
    const uv = geom.getAttribute("uv");
    for (let idx = 0; idx < pos.count; idx += 1) {
      const rear: number = flat ? pos.getY(idx) : -pos.getZ(idx);
      if (rear <= 0) continue;
      if (flat) pos.setY(idx, rear * TABLE_REAR_SCALE);
      else pos.setZ(idx, -rear * TABLE_REAR_SCALE);
      if (flat || geom === tableGeoms.regularEdge) {
        uv.setY(idx, 0.5 + (uv.getY(idx) - 0.5) * TABLE_REAR_SCALE);
      }
    }
    geom.computeVertexNormals();
    if (geom === tableGeoms.natureEdge && geom instanceof LatheGeometry) weldTrunkEdge(geom);
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
  }
}
