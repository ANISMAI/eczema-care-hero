export interface FloorPoint { x: number; y: number }
export interface VisitorState extends FloorPoint {
  heading: number;
  walking: boolean;
  escaped: boolean;
}

/** Distances and speed are relative to the floor's shorter side. */
export const ROACH_GUIDE = { reach: 0.34, speed: 0.42, exitX: 0.94, exitTop: 0.3, exitBottom: 0.7 } as const;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

export function createVisitor(seed: number): VisitorState {
  return { x: 0.22, y: 0.4 + (Math.abs(seed) % 5) * 0.04, heading: 90, walking: false, escaped: false };
}

/** The broom repels the visitor locally; moving the broom never teleports it. */
export function guideVisitor(visitor: VisitorState, broom: FloorPoint, held: boolean, dt: number,
  floor: { width: number; height: number }): VisitorState {
  if (visitor.escaped || floor.width <= 0 || floor.height <= 0) return visitor;
  const dx = (visitor.x - broom.x) * floor.width;
  const dy = (visitor.y - broom.y) * floor.height;
  const distance = Math.hypot(dx, dy);
  const unit = Math.min(floor.width, floor.height);
  if (!held || distance > unit * ROACH_GUIDE.reach) return { ...visitor, walking: false };
  let vx = distance > 1 ? dx / distance : 1;
  let vy = distance > 1 ? dy / distance : 0;
  // A gentle turn through the doorway prevents the frame from becoming a trap.
  if (visitor.x > 0.65 && vx > 0) {
    vy = vy * 0.55 + (0.5 - visitor.y) * 2;
    vx = Math.max(0.45, vx);
  }
  const length = Math.hypot(vx, vy);
  const step = unit * ROACH_GUIDE.speed * clamp(dt, 0, 0.05);
  const y = clamp(visitor.y + vy / length * step / floor.height, 0.15, 0.85);
  const atDoor = y >= ROACH_GUIDE.exitTop && y <= ROACH_GUIDE.exitBottom;
  const x = clamp(visitor.x + vx / length * step / floor.width, 0.07, atDoor ? 0.98 : 0.88);
  return { x, y, heading: Math.atan2(vy, vx) * 180 / Math.PI + 90,
    walking: Math.hypot(x - visitor.x, y - visitor.y) > 0.00001,
    escaped: atDoor && x >= ROACH_GUIDE.exitX };
}
