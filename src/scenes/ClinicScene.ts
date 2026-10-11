import Phaser from "phaser";
import Player from "../entities/Player";
import MovementSystem from "../systems/Movement";
import InteractionSystem from "../systems/Interaction";
import NavigationSystem from "../systems/Navigation";
import HUD from "../ui/HUD";
import MiniMap from "../ui/MiniMap";
import FullMap from "../ui/FullMap";
import Dialog from "../ui/Dialog";
import { ROOMS, WORLD_BOUNDS, getRoomWalls, findRoomAt, type RoomId, type InteractableDef } from "../data/rooms";
import { loadSave, saveGame } from "../data/save";

export default class ClinicScene extends Phaser.Scene {
  private player!: Player;
  private movement!: MovementSystem;
  private interaction!: InteractionSystem;
  private navigation!: NavigationSystem;
  private hud!: HUD;
  private miniMap!: MiniMap;
  private fullMap!: FullMap;
  private dialog!: Dialog;

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

    const wallsGroup = this.buildWalls();

    this.player = new Player(this, save.playerX, save.playerY);
    this.physics.add.collider(this.player, wallsGroup);

    this.cameras.main.setBounds(0, 0, WORLD_BOUNDS.width, WORLD_BOUNDS.height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.movement = new MovementSystem(this, this.player);
    this.interaction = new InteractionSystem();
    this.navigation = new NavigationSystem(this.player);

    this.buildUI();

    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.persist() });
    window.addEventListener("beforeunload", () => this.persist());
  }

  private drawWorld(): void {
    const bg = this.add.rectangle(
      WORLD_BOUNDS.width / 2,
      WORLD_BOUNDS.height / 2,
      WORLD_BOUNDS.width,
      WORLD_BOUNDS.height,
      0x2f2750
    );
    bg.setDepth(-10);

    for (const room of ROOMS) {
      const { x, y, width, height } = room.bounds;
      const floor = this.add.rectangle(x + width / 2, y + height / 2, width, height, room.color);
      floor.setDepth(-5);

      this.add
        .text(x + width / 2, y + 14, room.label, {
          fontFamily: "sans-serif",
          fontSize: "13px",
          color: "#2a2a2a",
        })
        .setOrigin(0.5, 0)
        .setDepth(-4);

      for (const item of room.interactables) {
        const texture = item.kind === "npc" ? "npc-marker" : "object-marker";
        this.add.image(item.x, item.y, texture).setDepth(-3);
        this.add
          .text(item.x, item.y + 26, item.label, {
            fontFamily: "sans-serif",
            fontSize: "10px",
            color: "#ffffff",
          })
          .setOrigin(0.5, 0)
          .setDepth(-3);
      }
    }
  }

  private buildWalls(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    for (const room of ROOMS) {
      for (const wall of getRoomWalls(room)) {
        if (wall.width <= 0 || wall.height <= 0) continue;
        const rect = this.add.rectangle(
          wall.x + wall.width / 2,
          wall.y + wall.height / 2,
          wall.width,
          wall.height,
          0x4a3f6b
        );
        this.physics.add.existing(rect, true);
        group.add(rect);
      }
    }
    return group;
  }

  private buildUI(): void {
    const uiRoot = document.getElementById("ui-root")!;

    this.hud = new HUD(uiRoot, {
      onJoystickMove: (x, y) => this.movement.setJoystickVector(x, y),
      onInteract: () => this.handleInteract(),
      onMiniMapTap: () => this.openFullMap(),
    });
    this.miniMap = new MiniMap(this.hud.miniMapMount, () => this.openFullMap());
    this.fullMap = new FullMap(uiRoot, (roomId) => this.handleGoHere(roomId));
    this.dialog = new Dialog(uiRoot);
  }

  private handleInteract(): void {
    if (this.inputLocked || !this.nearestInteractable) return;
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
    this.dialog.open(this.nearestInteractable.dialogTitle, this.nearestInteractable.dialogText, () => {
      this.inputLocked = false;
    });
  }

  private openFullMap(): void {
    if (this.inputLocked) return;
    this.inputLocked = true;
    this.player.setVelocity(0, 0);
    this.fullMap.open(this.currentRoomId);
    this.watchFullMapClose();
  }

  private watchFullMapClose(): void {
    const check = () => {
      if (!this.fullMap.isOpen) {
        this.inputLocked = false;
        return;
      }
      this.time.delayedCall(100, check);
    };
    this.time.delayedCall(100, check);
  }

  private handleGoHere(roomId: RoomId): void {
    this.navigation.teleportToRoom(roomId);
    this.currentRoomId = roomId;
    this.inputLocked = false;
    this.persist();
  }

  update(): void {
    if (this.inputLocked) {
      this.player.setVelocity(0, 0);
    } else {
      this.movement.update();
    }

    const room = findRoomAt(this.player.x, this.player.y);
    if (room) this.currentRoomId = room.id;

    this.nearestInteractable = this.interaction.getNearest(this.player.x, this.player.y);
    this.hud.setInteractVisible(!!this.nearestInteractable && !this.inputLocked, this.nearestInteractable?.label);

    this.miniMap.draw(this.player.x, this.player.y, this.currentRoomId);
  }

  private persist(): void {
    saveGame({
      version: 1,
      playerX: this.player.x,
      playerY: this.player.y,
      currentRoomId: this.currentRoomId,
      settings: { musicOn: true },
    });
  }
}
