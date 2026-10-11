import Phaser from "phaser";
import Player from "../entities/Player";
import MovementSystem from "../systems/Movement";
import InteractionSystem from "../systems/Interaction";
import NavigationSystem from "../systems/Navigation";
import HUD from "../ui/HUD";
import MiniMap from "../ui/MiniMap";
import FullMap from "../ui/FullMap";
import Dialog from "../ui/Dialog";
import {
  ROOMS,
  HALLWAY,
  HALLWAY_FURNITURE,
  WORLD_BOUNDS,
  getRoomWalls,
  getHallwayWalls,
  getAllWalls,
  getFurnitureSolids,
  findRoomAt,
  isWalkable,
  type RoomId,
  type InteractableDef,
  type Rect,
} from "../data/rooms";
import { loadSave, saveGame, SAVE_VERSION } from "../data/save";
import { RENDER_SCALE } from "../game/display";
import { createFurniture } from "../art/furniture";
import { drawPatient } from "../art/characters";
import {
  HALLWAY_FLOOR,
  HALLWAY_WALL,
  createMarker,
  drawDoor,
  drawFloor,
  drawGarden,
  drawHallwayRunner,
  drawRoomPlaque,
  drawWall,
  type Marker,
} from "../art/environment";

const MARKER_LIFT = 62; // how far above an interactable its bubble floats

export default class ClinicScene extends Phaser.Scene {
  private player!: Player;
  private movement!: MovementSystem;
  private interaction!: InteractionSystem;
  private navigation!: NavigationSystem;
  private hud!: HUD;
  private miniMap!: MiniMap;
  private fullMap!: FullMap;
  private dialog!: Dialog;

  private markers = new Map<string, Marker>();
  private currentRoomId: RoomId = "reception";
  private nearestInteractable: InteractableDef | null = null;
  private inputLocked = false;

  constructor() {
    super("ClinicScene");
  }

  create(): void {
    const save = loadSave();
    this.currentRoomId = save.currentRoomId;

    this.physics.world.setBounds(0, 0, WORLD_BOUNDS.width, WORLD_BOUNDS.height);
    this.drawWorld();
    const solids = this.buildColliders();
    this.checkLayout();

    this.player = new Player(this, save.playerX, save.playerY);
    this.physics.add.collider(this.player, solids);

    const cam = this.cameras.main;
    cam.setZoom(RENDER_SCALE);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(false);
    this.fitCamera();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this));

    this.movement = new MovementSystem(this, this.player);
    this.interaction = new InteractionSystem();
    this.navigation = new NavigationSystem(this.player);

    this.buildUI();
    this.hud.showRoomToast(this.roomLabel(findRoomAt(this.player.x, this.player.y)?.id ?? null));

    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.persist() });
    window.addEventListener("beforeunload", () => this.persist());
  }

  /**
   * Matches the camera to the (possibly rotated) screen. If the screen shows more than the
   * whole clinic along one axis — e.g. a wide landscape tablet — the bounds grow evenly on both
   * sides so the clinic stays centred instead of sticking to one edge.
   */
  private fitCamera(): void {
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    const viewW = this.scale.width / RENDER_SCALE;
    const viewH = this.scale.height / RENDER_SCALE;
    const padX = Math.max(0, (viewW - WORLD_BOUNDS.width) / 2);
    const padY = Math.max(0, (viewH - WORLD_BOUNDS.height) / 2);
    cam.setBounds(-padX, -padY, WORLD_BOUNDS.width + padX * 2, WORLD_BOUNDS.height + padY * 2);
  }

  // ---------- World ----------

  private drawWorld(): void {
    drawGarden(this);

    drawFloor(this, HALLWAY, HALLWAY_FLOOR);
    drawHallwayRunner(this);
    for (const wall of getHallwayWalls()) drawWall(this, wall, HALLWAY_WALL);
    for (const item of HALLWAY_FURNITURE) createFurniture(this, item);

    for (const room of ROOMS) {
      drawFloor(this, room.bounds, room.floor);
      for (const wall of getRoomWalls(room)) drawWall(this, wall, room.color);
      drawDoor(this, room);
      drawRoomPlaque(this, room);
      for (const item of room.furniture) createFurniture(this, item);

      for (const npc of room.npcs) {
        // NPCs sit on chairs: drawn just in front of the chair they sit on.
        const g = this.add.graphics();
        drawPatient(g, npc.variant);
        g.setPosition(npc.x, npc.y + 6).setDepth(npc.y + 11);
      }

      for (const item of room.interactables) {
        this.markers.set(item.id, createMarker(this, item.x, item.y - MARKER_LIFT, item.kind === "npc"));
      }
    }
  }

  private buildColliders(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    const addZone = (r: Rect) => {
      if (r.width <= 0 || r.height <= 0) return;
      const zone = this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height);
      this.physics.add.existing(zone, true);
      group.add(zone);
    };
    getAllWalls().forEach(addZone);
    getFurnitureSolids().forEach(addZone);
    return group;
  }

  /** Dev guard: warns if a layout edit puts a spawn point inside a wall or furniture. */
  private checkLayout(): void {
    for (const room of ROOMS) {
      if (!isWalkable(room.spawn.x, room.spawn.y)) {
        console.warn(`[layout] spawn for "${room.id}" is blocked — adjust it in data/rooms.ts`);
      }
    }
  }

  // ---------- UI ----------

  private buildUI(): void {
    const uiRoot = document.getElementById("ui-root")!;

    this.hud = new HUD(uiRoot, {
      onJoystickMove: (x, y) => this.movement.setJoystickVector(x, y),
      onInteract: () => this.handleInteract(),
      onMiniMapTap: () => this.openFullMap(),
    });
    this.miniMap = new MiniMap(this.hud.miniMapMount);
    this.fullMap = new FullMap(uiRoot, {
      onGoHere: (roomId) => this.handleGoHere(roomId),
      onClose: () => (this.inputLocked = false),
    });
    this.dialog = new Dialog(uiRoot);

    this.input.keyboard?.on("keydown-E", () => this.handleInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.handleInteract());
    this.input.keyboard?.on("keydown-M", () => this.openFullMap());
  }

  private handleInteract(): void {
    if (this.inputLocked || !this.nearestInteractable) return;
    const item = this.nearestInteractable;
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
    this.dialog.open(item.dialogTitle, item.dialogText, item.icon, () => {
      this.inputLocked = false;
    });
  }

  private openFullMap(): void {
    if (this.inputLocked) return;
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
    // In the hallway no room is "current", so every room is a valid destination.
    const here = findRoomAt(this.player.x, this.player.y)?.id ?? null;
    this.fullMap.open(here, { x: this.player.x, y: this.player.y });
  }

  private handleGoHere(roomId: RoomId): void {
    if (!this.navigation.travelTo(roomId)) return;
    this.currentRoomId = roomId;
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.hud.showRoomToast(this.roomLabel(roomId));
    this.persist();
  }

  private roomLabel(id: RoomId | null): string {
    if (!id) return "🚪  Hallway";
    const room = ROOMS.find((r) => r.id === id)!;
    return `${room.icon}  ${room.label}`;
  }

  // ---------- Loop ----------

  update(_time: number, delta: number): void {
    if (this.inputLocked) {
      this.player.setVelocity(0, 0);
    } else {
      this.movement.update();
    }
    this.player.tick(delta);

    const room = findRoomAt(this.player.x, this.player.y);
    if (room && room.id !== this.currentRoomId) {
      this.currentRoomId = room.id;
      this.hud.showRoomToast(this.roomLabel(room.id));
    }

    this.nearestInteractable = this.interaction.getNearest(this.player.x, this.player.y);
    this.markers.forEach((m, id) => m.setActive(id === this.nearestInteractable?.id));
    this.hud.setInteractTarget(this.inputLocked ? null : this.nearestInteractable);

    this.miniMap.draw(this.player.x, this.player.y, this.currentRoomId, this.player.lastFacingAngle);
  }

  private persist(): void {
    saveGame({
      version: SAVE_VERSION,
      playerX: this.player.x,
      playerY: this.player.y,
      currentRoomId: this.currentRoomId,
      settings: { musicOn: true },
    });
  }
}
