import Player from "../entities/Player";
import { getRoomById, isWalkable, type RoomId } from "../data/rooms";

/**
 * Handles moving the player to a room. Phase 1 uses an instant "Go Here" teleport to the
 * room's safe spawn point by the door; kept isolated so a later phase can swap travelTo()
 * for pathfinding/auto-walk without touching the map UI (brief section 05).
 */
export default class NavigationSystem {
  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  /** Returns false (and leaves the player where they are) if the destination is unusable. */
  travelTo(roomId: RoomId): boolean {
    const room = getRoomById(roomId);
    if (!room.accessible || !isWalkable(room.spawn.x, room.spawn.y)) return false;
    this.player.teleportTo(room.spawn.x, room.spawn.y);
    return true;
  }
}
