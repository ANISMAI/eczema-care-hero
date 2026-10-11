import Phaser from "phaser";
import { ROOMS, type InteractableDef } from "../data/rooms";

const ALL_INTERACTABLES: InteractableDef[] = ROOMS.flatMap((r) => r.interactables);

/** Finds the nearest interactable within its trigger radius of the player, if any. */
export default class InteractionSystem {
  getNearest(playerX: number, playerY: number): InteractableDef | null {
    let closest: InteractableDef | null = null;
    let closestDist = Infinity;

    for (const item of ALL_INTERACTABLES) {
      const dist = Phaser.Math.Distance.Between(playerX, playerY, item.x, item.y);
      if (dist <= item.radius && dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }
    return closest;
  }
}
