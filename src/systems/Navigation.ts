import Phaser from "phaser";
import Player from "../entities/Player";
import Pathfinder from "./Pathfinding";
import { PAL } from "../art/palette";
import { TRAVEL } from "../data/gameplay";
import { getRoomById, isWalkable, type Point, type Rect, type RoomId } from "../data/rooms";

/** Auto-walk is a brisk walk, a little faster than walking by hand so long trips don't drag. */
const AUTO_SPEED = TRAVEL.autoSpeed;
const ARRIVE_DIST = 5;

export type ArrivalHandler = () => void;

/**
 * Moves the player to a room or a person. "Go Here" and "Find" start an auto-walk: the player
 * follows a path found with A* (through doors and around furniture), with a walking animation
 * and a pulsing marker at the destination. Manual input cancels it. Blocked routes
 * are replanned or stopped; room travel always uses walking and collision checks.
 */
export default class NavigationSystem {
  private scene: Phaser.Scene;
  private player: Player;
  private pathfinder: Pathfinder;
  private path: Point[] = [];
  private onArrive: ArrivalHandler | null = null;
  private marker: Phaser.GameObjects.Container | null = null;
  private stuckMs = 0;
  private lastDist = Infinity;
  private destination: Point | null = null;
  private replans = 0;
  private onBlocked: (() => void) | null = null;
  private reportBlocked: () => void;

  constructor(scene: Phaser.Scene, player: Player, extraSolids: Rect[] = [], reportBlocked = () => {}) {
    this.scene = scene;
    this.player = player;
    this.pathfinder = new Pathfinder(extraSolids);
    this.reportBlocked = reportBlocked;
  }

  get walking(): boolean {
    return this.path.length > 0;
  }

  /** Walk to a room's entrance spot. Returns false if the room can't be travelled to. */
  walkToRoom(roomId: RoomId, onArrive?: ArrivalHandler): boolean {
    const room = getRoomById(roomId);
    if (!room.accessible || !isWalkable(room.spawn.x, room.spawn.y)) return false;
    return this.walkTo(room.spawn, onArrive);
  }

  /** Walk to a free spot next to `target` (e.g. a staff member), else to `fallbackRoom`. */
  walkNear(target: Point, fallbackRoom: RoomId, onArrive?: ArrivalHandler): boolean {
    const offsets = [
      [0, 44],
      [40, 20],
      [-40, 20],
      [0, 64],
      [56, 0],
      [-56, 0],
      [0, -40],
    ];
    const here = { x: this.player.x, y: this.player.y };
    const spots = offsets
      .map(([dx, dy]) => ({ x: target.x + dx, y: target.y + dy }))
      .filter((p) => this.pathfinder.clear(p.x, p.y))
      // prefer the side facing the player, so they don't walk around the person
      .sort((a, b) => Math.hypot(a.x - here.x, a.y - here.y) - Math.hypot(b.x - here.x, b.y - here.y));
    for (const spot of spots) if (this.walkTo(spot, onArrive)) return true;
    return this.walkToRoom(fallbackRoom, onArrive);
  }

  walkTo(dest: Point, onArrive?: ArrivalHandler, onBlocked?: () => void): boolean {
    this.cancel();
    const from = { x: this.player.x, y: this.player.y };
    const path = this.pathfinder.find(from, dest);
    if (!path) return false;
    this.onArrive = onArrive ?? null;
    this.onBlocked = onBlocked ?? null;
    this.destination = { ...dest };
    this.replans = 0;
    if (!path.length) { this.finish(); return true; }
    this.path = path;
    this.stuckMs = 0;
    this.lastDist = Infinity;
    this.showMarker(path[path.length - 1]);
    return true;
  }

  /** Stops an auto-walk without arriving (e.g. the player took over). */
  cancel(): void {
    const blocked = this.onBlocked;
    this.path = [];
    this.onArrive = null;
    this.onBlocked = null;
    this.destination = null;
    this.player.setVelocity(0, 0);
    this.hideMarker();
    blocked?.();
  }

  /** Drives the auto-walk; call every frame while `walking`. */
  update(deltaMs: number): void {
    if (!this.path.length) return;
    const next = this.path[0];
    const dx = next.x - this.player.x;
    const dy = next.y - this.player.y;
    const dist = Math.hypot(dx, dy);
    const step = (AUTO_SPEED * deltaMs) / 1000;

    if (dist <= ARRIVE_DIST) {
      this.advance();
      return;
    }

    // Replan from the actual position when collision prevents progress. Never skip a wall.
    if (dist < this.lastDist - 0.5) this.stuckMs = 0;
    else this.stuckMs += deltaMs;
    this.lastDist = dist;
    if (this.stuckMs > TRAVEL.stuckMs) {
      const route = this.destination && this.replans < TRAVEL.maxReplans
        ? this.pathfinder.find({ x: this.player.x, y: this.player.y }, this.destination) : null;
      this.replans++;
      this.stuckMs = 0;
      this.lastDist = Infinity;
      if (route?.length) this.path = route;
      else {
        this.cancel();
        this.reportBlocked();
      }
      return;
    }

    const speed = dist < step ? dist / Math.max(deltaMs / 1000, 0.001) : AUTO_SPEED;
    this.player.setVelocity((dx / dist) * speed, (dy / dist) * speed);
  }

  private advance(): void {
    this.path.shift();
    this.stuckMs = 0;
    this.lastDist = Infinity;
    if (this.path.length) {
      // keep moving smoothly towards the next waypoint this frame
      const n = this.path[0];
      const dx = n.x - this.player.x;
      const dy = n.y - this.player.y;
      const d = Math.hypot(dx, dy) || 1;
      this.player.setVelocity((dx / d) * AUTO_SPEED, (dy / d) * AUTO_SPEED);
      return;
    }
    this.player.setVelocity(0, 0);
    this.finish();
  }

  private finish(): void {
    const cb = this.onArrive;
    this.onArrive = null;
    this.onBlocked = null;
    this.destination = null;
    this.hideMarker();
    cb?.();
  }

  private showMarker(at: Point): void {
    const ring = this.scene.add.graphics();
    ring.lineStyle(3, PAL.pink, 1);
    ring.strokeEllipse(0, 0, 34, 16);
    ring.fillStyle(PAL.pink, 0.25);
    ring.fillEllipse(0, 0, 34, 16);
    const dot = this.scene.add.graphics();
    dot.fillStyle(PAL.pink, 1);
    dot.fillEllipse(0, 0, 10, 5);
    this.marker = this.scene.add.container(at.x, at.y + 2, [ring, dot]).setDepth(-30);
    this.scene.tweens.add({ targets: ring, scaleX: 1.35, scaleY: 1.35, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
  }

  private hideMarker(): void {
    if (!this.marker) return;
    this.scene.tweens.killTweensOf(this.marker.list);
    this.marker.destroy();
    this.marker = null;
  }
}
