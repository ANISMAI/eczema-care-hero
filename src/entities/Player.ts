import Phaser from "phaser";
import { drawStaff, type Facing } from "../art/characters";
import { PAL } from "../art/palette";
import { PLAYER_RADIUS } from "../data/rooms";
import type { CharacterDirection, CharacterSheet } from "../data/assets";
import { walkAnimScale } from "../data/assets";

/**
 * Player avatar. The container's position is the point between the feet, which is also the
 * centre of the circular collision body. Facing is tracked in 8 directions (lastFacingAngle)
 * and shown with the nearest of 4 directions.
 *
 * Uses the chosen character's walk-cycle spritesheet when it loaded, otherwise the vector
 * placeholder. The character can be swapped at any time with setCharacter().
 */
export default class Player extends Phaser.GameObjects.Container {
  declare body: Phaser.Physics.Arcade.Body;
  private sheet: CharacterSheet | null = null;
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private vector: Phaser.GameObjects.Graphics | null = null;
  private direction: CharacterDirection = "down";
  private walkTime = 0;
  private wasMoving = false;
  lastFacingAngle = 90; // facing down by default
  /** Riding the hoverboard (HUD button): faster, standing still on the board instead of stepping. */
  riding = false;
  private board: Phaser.GameObjects.Graphics | null = null;
  /** Which way the board was last drawn ("front" for up/down, "side" for left/right). */
  private boardView: "front" | "side" | null = null;
  private trail: Phaser.GameObjects.Graphics | null = null;
  private hoverTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, sheet: CharacterSheet | null) {
    super(scene, x, y);

    const shadow = scene.add.graphics();
    shadow.fillStyle(PAL.shadow, 0.22);
    shadow.fillEllipse(0, 1, 30, 10);
    this.add(shadow);
    this.setCharacter(sheet);

    this.setSize(PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setCircle(PLAYER_RADIUS);
    this.body.setCollideWorldBounds(true);
  }

  /** Switches the avatar's art, keeping position and facing. */
  setCharacter(sheet: CharacterSheet | null): void {
    this.sprite?.destroy();
    this.vector?.destroy();
    this.sprite = null;
    this.vector = null;

    if (sheet && this.scene.textures.exists(sheet.key)) {
      this.sheet = sheet;
      this.sprite = this.scene.add.sprite(0, 2, sheet.key, sheet.rows[this.direction] * 3);
      this.sprite.setOrigin(0.5, (sheet.frameHeight - sheet.padding) / sheet.frameHeight);
      this.sprite.setScale(sheet.displayHeight / sheet.contentHeight);
      this.add(this.sprite);
    } else {
      this.sheet = null;
      this.vector = this.scene.add.graphics();
      this.drawVector();
      this.add(this.vector);
    }
    this.wasMoving = true; // re-apply the idle frame / walk state on the next tick
  }

  /** Hops on or off the hoverboard. */
  setRiding(on: boolean): void {
    this.riding = on;
    this.board?.destroy();
    this.trail?.destroy();
    this.board = null;
    this.trail = null;
    this.boardView = null;
    if (on) {
      // behind the doctor (who stands on it): speed lines, then the board
      this.trail = this.scene.add.graphics();
      this.addAt(this.trail, 1);
      this.board = this.scene.add.graphics();
      this.addAt(this.board, 2);
      this.drawBoard();
    } else if (this.sprite) {
      this.sprite.rotation = 0;
      this.sprite.y = 2;
    }
    this.wasMoving = true;
  }

  /**
   * The hoverboard under the feet: a dark deck with a cyan light strip and a big wheel at each
   * end, and a soft glow beneath. Seen from the front (wheels left and right) when facing up or
   * down, from the side (one wheel showing) when facing left or right.
   */
  private drawBoard(): void {
    const g = this.board;
    if (!g) return;
    const view = this.direction === "left" || this.direction === "right" ? "side" : "front";
    if (view === this.boardView) return;
    this.boardView = view;
    g.clear();
    const DECK = 0x26324a;
    const LIGHT = 0x5ee6f5;
    g.fillStyle(LIGHT, 0.22);
    g.fillEllipse(0, 6, view === "front" ? 54 : 40, 12);
    const wheel = (x: number, r: number) => {
      g.fillStyle(0x11182a, 1);
      g.fillCircle(x, 2, r);
      g.fillStyle(0xcfd8e6, 1);
      g.fillCircle(x, 2, r * 0.45);
      g.fillStyle(LIGHT, 1);
      g.fillCircle(x, 2, r * 0.18);
    };
    if (view === "front") {
      wheel(-20, 7);
      wheel(20, 7);
      g.fillStyle(DECK, 1);
      g.fillRoundedRect(-17, -3, 34, 9, 4.5);
      g.fillStyle(LIGHT, 1);
      g.fillRoundedRect(-11, 3, 22, 2, 1);
      g.fillStyle(0x3b4a66, 1);
      g.fillRoundedRect(-14, -2.5, 11, 3, 1.5);
      g.fillRoundedRect(3, -2.5, 11, 3, 1.5);
    } else {
      wheel(0, 8.5);
      g.fillStyle(DECK, 1);
      g.fillRoundedRect(-15, -2, 30, 8, 4);
      g.fillStyle(LIGHT, 1);
      g.fillRoundedRect(-10, 3, 20, 2, 1);
    }
  }

  /** Short speed lines streaming out behind the doctor while riding. */
  private drawTrail(moving: boolean): void {
    const g = this.trail;
    if (!g) return;
    g.clear();
    if (!moving) return;
    const v = this.body.velocity;
    const len = v.length() || 1;
    const bx = -v.x / len;
    const by = -v.y / len;
    const flicker = 0.35 + 0.25 * Math.sin(this.hoverTime / 60);
    g.lineStyle(2, 0xffffff, flicker);
    for (const [side, start, size] of [[-9, 10, 14], [0, 16, 18], [9, 10, 14]] as const) {
      const ox = -by * side;
      const oy = bx * side - 22;
      g.lineBetween(ox + bx * start, oy + by * start, ox + bx * (start + size), oy + by * (start + size));
    }
  }

  setVelocity(vx: number, vy: number): void {
    this.body.setVelocity(vx, vy);
    if (vx !== 0 || vy !== 0) {
      this.updateFacing(vx, vy);
    }
  }

  private updateFacing(vx: number, vy: number): void {
    const rawAngle = Phaser.Math.RadToDeg(Math.atan2(vy, vx));
    this.lastFacingAngle = Math.round(rawAngle / 45) * 45;

    const dir: CharacterDirection =
      Math.abs(vx) > Math.abs(vy) * 1.2 ? (vx < 0 ? "left" : "right") : vy < 0 ? "up" : "down";
    if (dir === this.direction) return;
    this.direction = dir;
    if (this.vector) this.drawVector();
    this.drawBoard();
  }

  /**
   * For scripted moves (cut-scenes): face a direction, and optionally play the walk cycle
   * while the avatar is moved by a tween rather than by physics.
   */
  face(dir: CharacterDirection, walking = false): void {
    this.direction = dir;
    this.lastFacingAngle = { down: 90, up: -90, left: 180, right: 0 }[dir];
    if (this.vector) this.drawVector();
    if (this.sprite && this.sheet) {
      if (walking) {
        this.sprite.anims.play(`${this.sheet.key}-walk-${dir}`, true);
        this.sprite.anims.timeScale = 0.8;
      } else {
        this.sprite.anims.stop();
        this.sprite.setFrame(this.sheet.rows[dir] * 3);
      }
    }
  }

  private drawVector(): void {
    if (!this.vector) return;
    const facing: Facing = this.direction === "left" || this.direction === "right" ? "side" : this.direction;
    drawStaff(this.vector, facing);
    this.vector.setScale(this.direction === "left" ? -1 : 1, 1);
  }

  /** Walk animation + depth sorting; call once per frame. */
  tick(deltaMs: number): void {
    const moving = this.body.velocity.lengthSq() > 1;

    if (this.riding) this.hoverTime += deltaMs;
    this.drawTrail(moving && this.riding);

    if (this.sprite && this.sheet && this.riding) {
      // on the board: no steps, standing on the deck, gently hovering up and down, and leaning
      // a little into a sideways move
      const bob = Math.sin(this.hoverTime / 260) * 1.5;
      if (this.board) this.board.y = bob;
      this.sprite.anims.stop();
      this.sprite.setFrame(this.sheet.rows[this.direction] * 3);
      this.sprite.y = 2 - 1 + bob; // feet on the deck
      this.sprite.rotation = moving ? (this.direction === "right" ? 0.06 : this.direction === "left" ? -0.06 : 0) : 0;
    } else if (this.sprite && this.sheet) {
      this.sprite.rotation = 0;
      this.sprite.y = 2;
      if (moving) {
        this.sprite.anims.play(`${this.sheet.key}-walk-${this.direction}`, true);
        // steps keep pace with the actual speed (normal walk, brisk auto-walk...)
        this.sprite.anims.timeScale = walkAnimScale(this.body.velocity.length(), this.sheet);
      } else if (this.wasMoving) {
        this.sprite.anims.stop();
        this.sprite.setFrame(this.sheet.rows[this.direction] * 3);
      }
    } else if (this.vector) {
      if (moving) {
        this.walkTime += deltaMs;
        const phase = this.walkTime / 90;
        this.vector.y = -Math.abs(Math.sin(phase)) * 3;
        this.vector.rotation = Math.sin(phase) * 0.06;
      } else {
        this.walkTime = 0;
        this.vector.y = 0;
        this.vector.rotation = 0;
      }
    }

    this.wasMoving = moving;
    this.setDepth(this.y + PLAYER_RADIUS);
  }

  teleportTo(x: number, y: number): void {
    this.setPosition(x, y);
    this.body.reset(x, y);
  }
}
