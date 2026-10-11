import { PLAYER_RADIUS, WORLD_BOUNDS, bodyFits, type Point, type Rect } from "../data/rooms";

// Grid A* over the clinic floor, used by auto-walk. Cells are blocked if the player's body
// (plus a little clearance) would touch a wall, furniture or a solid NPC there. The raw grid
// path is then straightened ("string pulling") so the walk looks natural, not zig-zag.

const CELL = 12;
const CLEARANCE = PLAYER_RADIUS + 3;

export default class Pathfinder {
  private cols = Math.ceil(WORLD_BOUNDS.width / CELL);
  private rows = Math.ceil(WORLD_BOUNDS.height / CELL);
  private open: Uint8Array;
  private extraSolids: Rect[];

  /** `extraSolids`: blockers not in the room data (e.g. standing NPCs). */
  constructor(extraSolids: Rect[] = []) {
    this.extraSolids = extraSolids;
    this.open = new Uint8Array(this.cols * this.rows);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const p = this.center(c, r);
        this.open[r * this.cols + c] = this.clear(p.x, p.y) ? 1 : 0;
      }
    }
  }

  /** True if the player's body fits at (x, y). */
  clear(x: number, y: number, radius = CLEARANCE): boolean {
    if (!bodyFits(x, y, radius)) return false;
    return !this.extraSolids.some((r) => {
      const nx = Math.max(r.x, Math.min(x, r.x + r.width));
      const ny = Math.max(r.y, Math.min(y, r.y + r.height));
      return (x - nx) ** 2 + (y - ny) ** 2 < radius * radius;
    });
  }

  private center(c: number, r: number): Point {
    return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 };
  }

  private cellOf(p: Point): [number, number] {
    return [Math.floor(p.x / CELL), Math.floor(p.y / CELL)];
  }

  private isOpen(c: number, r: number): boolean {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.open[r * this.cols + c] === 1;
  }

  /** Nearest open cell to a point (searching outward in rings). */
  private nearestOpen(p: Point): [number, number] | null {
    const [c0, r0] = this.cellOf(p);
    for (let ring = 0; ring < 12; ring++) {
      let best: [number, number] | null = null;
      let bestD = Infinity;
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
          const c = c0 + dc;
          const r = r0 + dr;
          if (!this.isOpen(c, r)) continue;
          const q = this.center(c, r);
          const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = [c, r];
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /** Straight segment the player can walk without touching anything. */
  private lineClear(a: Point, b: Point): boolean {
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(dist / 4));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.clear(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, PLAYER_RADIUS + 1)) return false;
    }
    return true;
  }

  /** Waypoints from `from` to `to` (excluding `from`), or null if there is no way through. */
  find(from: Point, to: Point): Point[] | null {
    const start = this.nearestOpen(from);
    const goal = this.nearestOpen(to);
    if (!start || !goal) return null;

    const n = this.cols * this.rows;
    const idx = (c: number, r: number) => r * this.cols + c;
    const g = new Float32Array(n).fill(Infinity);
    const came = new Int32Array(n).fill(-1);
    const closed = new Uint8Array(n);
    const heap: [number, number][] = []; // [f, index], binary min-heap
    const push = (f: number, i: number) => {
      heap.push([f, i]);
      let k = heap.length - 1;
      while (k > 0) {
        const p = (k - 1) >> 1;
        if (heap[p][0] <= heap[k][0]) break;
        [heap[p], heap[k]] = [heap[k], heap[p]];
        k = p;
      }
    };
    const pop = (): [number, number] => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let k = 0;
        for (;;) {
          const l = 2 * k + 1;
          const r = l + 1;
          let m = k;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === k) break;
          [heap[m], heap[k]] = [heap[k], heap[m]];
          k = m;
        }
      }
      return top;
    };
    const h = (c: number, r: number) => {
      const dx = Math.abs(c - goal[0]);
      const dy = Math.abs(r - goal[1]);
      return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
    };

    const s = idx(start[0], start[1]);
    const goalI = idx(goal[0], goal[1]);
    g[s] = 0;
    push(h(start[0], start[1]), s);

    while (heap.length) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      if (cur === goalI) break;
      closed[cur] = 1;
      const c = cur % this.cols;
      const r = (cur / this.cols) | 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dr) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (!this.isOpen(nc, nr)) continue;
          // no cutting corners past a blocked cell
          if (dc && dr && (!this.isOpen(c + dc, r) || !this.isOpen(c, r + dr))) continue;
          const ni = idx(nc, nr);
          const cost = g[cur] + (dc && dr ? Math.SQRT2 : 1);
          if (cost < g[ni]) {
            g[ni] = cost;
            came[ni] = cur;
            push(cost + h(nc, nr), ni);
          }
        }
      }
    }
    if (g[goalI] === Infinity) return null;

    const cells: Point[] = [];
    for (let i = goalI; i !== -1; i = came[i]) cells.push(this.center(i % this.cols, (i / this.cols) | 0));
    cells.reverse();
    if (this.clear(to.x, to.y, PLAYER_RADIUS + 1)) cells[cells.length - 1] = { ...to };

    // string pulling: from each anchor, jump to the farthest point still in straight sight
    const path: Point[] = [];
    let anchor = from;
    let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !this.lineClear(anchor, cells[j])) j--;
      path.push(cells[j]);
      anchor = cells[j];
      i = j + 1;
    }
    return path;
  }
}
