import Player from "../entities/Player";
import { getRoomById, type RoomId } from "../data/rooms";

/**
 * Handles moving the player to a room. Phase 1 uses an instant "Go Here" teleport;
 * kept isolated so a later phase can swap in pathfinding/auto-walk without touching
 * the map UI (per brief section 05: "Keep travel handling in a replaceable function").
 */
export default class NavigationSystem {
  private player: Player;

  constructor(player: Player) {
    this.player = player;
  }

  teleportToRoom(roomId: RoomId): void {
    const room = getRoomById(roomId);
    this.player.teleportTo(room.spawn.x, room.spawn.y);
  }
}
