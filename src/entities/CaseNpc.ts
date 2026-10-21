import Phaser from "phaser";
import Pathfinder from "../systems/Pathfinding";
import { addBaked } from "../art/bake";
import { PAL } from "../art/palette";
import { textStyle } from "../art/environment";
import type { CharacterDirection, CharacterSheet, SheetDef } from "../data/assets";
import { walkAnimScale } from "../data/assets";
import type { InteractableDef, Point } from "../data/rooms";

/** Visitors walk a little slower than the doctor (115) but not sluggishly. */
const WALK_SPEED = 80;

/**
 * A visiting patient. They can sit on a chair (pose sheet), walk somewhere on their own
 * (walk sheet + path finding) and stand waiting. `talk` follows them so the player can interact
 * wherever they are. Phase 3: one per visitor; `destroy()` when they leave the clinic.
 */
export default class CaseNpc {
  readonly talk: InteractableDef;
  private scene: Phaser.Scene;
  private walkSheet: CharacterSheet;
  private pathfinder: Pathfinder;
  private walker: Phaser.GameObjects.Sprite | null = null;
  private sitter: Phaser.GameObjects.Sprite | null = null;
  private shadow: Phaser.GameObjects.Image;
  private shadowOffset: Point;
  /** Small name pill over the head (used while placeholder art makes visitors look alike). */
  private nameTag: Phaser.GameObjects.Container | null = null;
  private pos: Point = { x: 0, y: 0 };
  private path: Point[] = [];
  private onArrive: (() => void) | null = null;
  private dir: CharacterDirection = "down";
  private seated = false;
  private visible = false;
  private blinkAt = 2000;
  private time = 0;
  private dead = false;

  constructor(
    scene: Phaser.Scene,
    walkSheet: CharacterSheet,
    sitSheet: SheetDef,
    talk: InteractableDef,
    pathfinder: Pathfinder,
    tint?: number,
    nameTag?: string
  ) {
    this.scene = scene;
    this.walkSheet = walkSheet;
    this.talk = talk;
    this.pathfinder = pathfinder;

    this.shadow = addBaked(scene, "case-npc-shadow", 0, 0, (g) => {
      g.fillStyle(PAL.shadow, 0.22);
      g.fillEllipse(0, 1, 28, 10);
    });
    this.shadowOffset = { x: this.shadow.x, y: this.shadow.y };
    if (scene.textures.exists(walkSheet.key)) {
      this.walker = this.sprite(walkSheet, walkSheet.rows.down * 3);
    }
    if (scene.textures.exists(sitSheet.key)) this.sitter = this.sprite(sitSheet, 0);
    if (tint !== undefined) {
      this.walker?.setTint(tint);
      this.sitter?.setTint(tint);
    }
    if (nameTag) this.nameTag = this.makeNameTag(nameTag);
    this.hide();
  }

  /** Removes the sprites for good (the visitor has left the clinic). */
  destroy(): void {
    this.dead = true;
    this.onArrive = null;
    this.path = [];
    this.visible = false;
    this.walker?.destroy();
    this.sitter?.destroy();
    this.shadow.destroy();
    this.nameTag?.destroy();
    this.nameTag = null;
    this.walker = null;
    this.sitter = null;
  }

  get isSeated(): boolean {
    return this.seated;
  }

  private sprite(sheet: SheetDef, frame: number): Phaser.GameObjects.Sprite {
    return this.scene.add
      .sprite(0, 0, sheet.key, frame)
      .setOrigin(0.5, (sheet.frameHeight - sheet.padding) / sheet.frameHeight)
      .setScale(sheet.displayHeight / sheet.contentHeight);
  }

  get isVisible(): boolean {
    return this.visible;
  }

  get isWalking(): boolean {
    return this.path.length > 0;
  }

  get position(): Point {
    return { ...this.pos };
  }

  /** Sits on a chair; `feet` is where the bottom of the seated figure touches the floor. */
  sitAt(feet: Point): void {
    this.onArrive = null;
    this.visible = true;
    this.seated = true;
    this.path = [];
    this.pos = { ...feet };
    this.sync();
  }

  /** Stands still at a spot, facing `dir`. */
  standAt(p: Point, dir: CharacterDirection = "down"): void {
    this.onArrive = null;
    this.visible = true;
    this.seated = false;
    this.path = [];
    this.pos = { ...p };
    this.dir = dir;
    this.walker?.anims.stop();
    this.walker?.setFrame(this.walkSheet.rows[dir] * 3);
    this.sync();
  }

  /** Walks to `dest`; if no path exists she simply appears there. */
  walkTo(dest: Point, onArrive?: () => void, from?: Point): void {
    if (from) this.pos = { ...from };
    this.visible = true;
    this.seated = false;
    this.onArrive = onArrive ?? null;
    const path = this.pathfinder.find(this.pos, dest);
    if (!path || !this.walker) {
      const cb = this.onArrive;
      this.standAt(dest);
      cb?.();
      return;
    }
    this.path = path;
    this.sync();
  }

  hide(): void {
    this.onArrive = null;
    this.visible = false;
    this.seated = false;
    this.path = [];
    this.sync();
  }

  update(deltaMs: number): void {
    if (!this.visible || this.dead) return;
    this.time += deltaMs;

    if (this.seated && this.sitter) {
      // blink now and then
      if (this.time > this.blinkAt) this.blinkAt = this.time + 2500 + Math.random() * 3000;
      this.sitter.setFrame(this.time > this.blinkAt - 140 ? 1 : 0);
      return;
    }

    if (!this.path.length || !this.walker) return;
    const next = this.path[0];
    const dx = next.x - this.pos.x;
    const dy = next.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = (WALK_SPEED * deltaMs) / 1000;
    if (dist <= step) {
      this.pos = { ...next };
      this.path.shift();
      if (!this.path.length) {
        this.walker.anims.stop();
        this.walker.setFrame(this.walkSheet.rows[this.dir] * 3);
        this.sync();
        this.arrive();
        return;
      }
    } else {
      this.pos.x += (dx / dist) * step;
      this.pos.y += (dy / dist) * step;
      this.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      this.walker.anims.play(`${this.walkSheet.key}-walk-${this.dir}`, true);
      this.walker.anims.timeScale = walkAnimScale(WALK_SPEED, this.walkSheet);
    }
    this.sync();
  }

  private arrive(): void {
    const cb = this.onArrive;
    this.onArrive = null;
    cb?.();
  }

  private makeNameTag(name: string): Phaser.GameObjects.Container {
    const label = this.scene.add.text(0, 0, name, textStyle(8, "#ffffff", "900")).setOrigin(0.5);
    const w = label.width + 10;
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x23364f, 0.85);
    bg.fillRoundedRect(-w / 2, -7, w, 14, 7);
    return this.scene.add.container(0, 0, [bg, label]).setVisible(false);
  }

  private sync(): void {
    if (this.dead) return;
    const { x, y } = this.pos;
    const showWalker = this.visible && !this.seated;
    const showSitter = this.visible && this.seated;
    this.walker?.setVisible(showWalker).setPosition(x, y + 2).setDepth(y + 12);
    this.sitter?.setVisible(showSitter).setPosition(x, y).setDepth(y + 1);
    this.shadow.setVisible(showWalker).setPosition(x + this.shadowOffset.x, y + this.shadowOffset.y).setDepth(y - 1);
    this.talk.x = x;
    this.talk.y = this.seated ? y - 12 : y;
    this.nameTag?.setVisible(this.visible).setPosition(x, y - (this.seated ? 56 : 72)).setDepth(y + 13);
  }
}
