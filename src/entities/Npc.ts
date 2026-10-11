import Phaser from "phaser";
import { drawPatient } from "../art/characters";
import { addBaked } from "../art/bake";
import { PAL } from "../art/palette";
import type { CharacterDirection, SheetDef } from "../data/assets";
import type { PoseNpcDef, WalkerNpcDef } from "../data/npcs";
import type { Point } from "../data/rooms";

const POSE_IDLE = 0;
const POSE_BLINK = 1;
const POSE_ACTION = 2;
const GREET_RANGE = 120;

/** Sprite standing on (x, y), scaled from its sheet to its in-world height. */
function makeSprite(scene: Phaser.Scene, sheet: SheetDef, x: number, y: number, frame: number) {
  return scene.add
    .sprite(x, y, sheet.key, frame)
    .setOrigin(0.5, (sheet.frameHeight - sheet.padding) / sheet.frameHeight)
    .setScale(sheet.displayHeight / sheet.contentHeight);
}

function shadow(scene: Phaser.Scene, x: number, y: number, w: number): Phaser.GameObjects.Image {
  return addBaked(scene, `npc-shadow-${w}`, x, y, (g) => {
    g.fillStyle(PAL.shadow, 0.22);
    g.fillEllipse(0, 1, w, 10);
  });
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** An NPC that stays put: blinks, fidgets with its action pose, or waves at the player. */
export class PoseNpc {
  private def: PoseNpcDef;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private shadowImg: Phaser.GameObjects.Image | null = null;
  private first: number;
  private nextBlink = rand(800, 4000);
  private blinkUntil = 0;
  private nextAction = rand(3000, 9000);
  private actionUntil = 0;
  private playerWasNear = false;
  private time = 0;

  constructor(scene: Phaser.Scene, def: PoseNpcDef) {
    this.def = def;
    this.first = def.row * 3;
    const { feet } = def;

    if (scene.textures.exists(def.sheet.key)) {
      if (def.solid) this.shadowImg = shadow(scene, feet.x, feet.y, 30).setDepth(feet.y - 1);
      this.sprite = makeSprite(scene, def.sheet, feet.x, feet.y, this.first + POSE_IDLE).setDepth(feet.y + 1);
    } else if (def.fallbackVariant !== undefined) {
      addBaked(scene, `visitor-${def.fallbackVariant}`, feet.x, feet.y - 6, (g) =>
        drawPatient(g, def.fallbackVariant!)
      ).setDepth(feet.y + 1);
    }
  }

  get id(): string {
    return this.def.id;
  }

  /** Show / hide (e.g. while the NPC is "visiting" another room). */
  setVisible(visible: boolean): void {
    this.sprite?.setVisible(visible);
    this.shadowImg?.setVisible(visible);
  }

  update(deltaMs: number, player: Point): void {
    if (!this.sprite) return;
    this.time += deltaMs;
    const t = this.time;

    if (this.def.behavior === "greeter") {
      const near = Phaser.Math.Distance.Between(player.x, player.y, this.def.feet.x, this.def.feet.y) < GREET_RANGE;
      if (near && !this.playerWasNear) this.actionUntil = t + 1500;
      this.playerWasNear = near;
    } else if (this.def.behavior === "fidget" && t >= this.nextAction) {
      this.actionUntil = t + rand(1800, 3200);
      this.nextAction = this.actionUntil + rand(5000, 11000);
    }

    if (t >= this.nextBlink) {
      this.blinkUntil = t + 140;
      this.nextBlink = t + rand(2500, 5500);
    }

    const pose = t < this.actionUntil ? POSE_ACTION : t < this.blinkUntil ? POSE_BLINK : POSE_IDLE;
    this.sprite.setFrame(this.first + pose);
  }
}

/** A walking NPC that paces back and forth along a path, and stops to face a nearby player. */
export class WalkerNpc {
  private def: WalkerNpcDef;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private shadowImg: Phaser.GameObjects.Image | null = null;
  private shadowOffset = { x: 0, y: 0 };
  private pos: Point;
  private target = 1;
  private step = 1;
  private waitUntil = 0;
  private time = 0;
  private dir: CharacterDirection = "down";

  constructor(scene: Phaser.Scene, def: WalkerNpcDef) {
    this.def = def;
    this.pos = { ...def.path[0] };
    if (!scene.textures.exists(def.sheet.key)) return;
    this.shadowImg = shadow(scene, this.pos.x, this.pos.y, 28);
    this.shadowOffset = { x: this.shadowImg.x - this.pos.x, y: this.shadowImg.y - this.pos.y };
    this.sprite = makeSprite(scene, def.sheet, this.pos.x, this.pos.y + 2, def.sheet.rows.down * 3);
    this.sync();
  }

  get visible(): boolean {
    return this.sprite !== null;
  }

  /** `hold`: stand still (e.g. while a dialog is open or the player is chatting). */
  update(deltaMs: number, player: Point, hold: boolean): void {
    if (!this.sprite) return;
    this.time += deltaMs;
    const { sheet, path, speed, pause } = this.def;

    const toPlayer = { x: player.x - this.pos.x, y: player.y - this.pos.y };
    const playerClose = Math.hypot(toPlayer.x, toPlayer.y) < 46;

    if (hold || playerClose || this.time < this.waitUntil) {
      if (playerClose) this.dir = this.facing(toPlayer.x, toPlayer.y);
      this.sprite.anims.stop();
      this.sprite.setFrame(sheet.rows[this.dir] * 3);
      this.sync();
      return;
    }

    const goal = path[this.target];
    const dx = goal.x - this.pos.x;
    const dy = goal.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const move = (speed * deltaMs) / 1000;

    if (dist <= move) {
      this.pos = { ...goal };
      if (this.target === path.length - 1 || this.target === 0) {
        this.waitUntil = this.time + pause;
        this.step = this.target === 0 ? 1 : -1;
      }
      this.target += this.step;
    } else {
      this.pos.x += (dx / dist) * move;
      this.pos.y += (dy / dist) * move;
      this.dir = this.facing(dx, dy);
      this.sprite.anims.play(`${sheet.key}-walk-${this.dir}`, true);
      this.sprite.anims.timeScale = speed / sheet.walkSpeed;
    }
    this.sync();
  }

  private facing(dx: number, dy: number): CharacterDirection {
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
  }

  private sync(): void {
    if (!this.sprite || !this.shadowImg) return;
    const { x, y } = this.pos;
    this.sprite.setPosition(x, y + 2).setDepth(y + 12);
    this.shadowImg.setPosition(x + this.shadowOffset.x, y + this.shadowOffset.y).setDepth(y - 1);
    this.def.talk.x = x;
    this.def.talk.y = y;
  }
}
