import Phaser from "phaser";
import type { InteractableDef } from "../data/rooms";

/** Distance from the player to the item's centre, or to its edge when it has an area. */
function distanceTo(item: InteractableDef, px: number, py: number): number {
  if (!item.area) return Phaser.Math.Distance.Between(px, py, item.x, item.y);
  const dx = Math.max(Math.abs(px - item.x) - item.area.w / 2, 0);
  const dy = Math.max(Math.abs(py - item.y) - item.area.h / 2, 0);
  return Math.hypot(dx, dy);
}

/** Finds the nearest interactable within its trigger radius of the player, if any. */
export default class InteractionSystem {
  private items: InteractableDef[];

  /** `items` may move (walking NPCs update their x/y); positions are read every call. */
  constructor(items: InteractableDef[]) {
    this.items = items;
  }

  getNearest(playerX: number, playerY: number): InteractableDef | null {
    let closest: InteractableDef | null = null;
    let closestDist = Infinity;

    for (const item of this.items) {
      const dist = distanceTo(item, playerX, playerY);
      if (dist <= item.radius && dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }
    return closest;
  }
}
