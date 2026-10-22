import { ROOMS, HALLWAYS, WORLD_BOUNDS, type Point, type Rect, type RoomId } from "../data/rooms";
import { shade, toCss } from "../art/palette";

// CSS size of the mini-map. The floor plan is drawn as in the game (entrance at the bottom),
// showing the whole width of the clinic; it scrolls up and down to follow the player.
const MAP_W = 120;
const MAP_H = 66;
const SCALE = MAP_W / WORLD_BOUNDS.width;

/** Always-visible top-right mini-map: simplified room shapes + a moving player arrow. */
export default class MiniMap {
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.min(3, window.devicePixelRatio || 1);
  private pulse = 0;
  private scrollY = 0;

  constructor(parent: HTMLElement) {
    const canvas = document.createElement("canvas");
    canvas.width = MAP_W * this.dpr;
    canvas.height = MAP_H * this.dpr;
    canvas.style.width = `${MAP_W}px`;
    canvas.style.height = `${MAP_H}px`;
    canvas.className = "minimap-canvas";
    this.ctx = canvas.getContext("2d")!;
    parent.prepend(canvas);
  }

  /** World point -> map point. */
  private mx(x: number): number {
    return x * SCALE;
  }

  private my(y: number): number {
    return y * SCALE - this.scrollY;
  }

  private rect(r: Rect): [number, number, number, number] {
    return [this.mx(r.x), this.my(r.y), r.width * SCALE, r.height * SCALE];
  }

  /** `quest`: next case destination (pink pin). `event`: optional clinic event (orange "!"). */
  draw(playerX: number, playerY: number, currentRoomId: RoomId, facingDeg: number, quest?: Point | null, event?: Point | null): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    const maxScroll = Math.max(0, WORLD_BOUNDS.height * SCALE - MAP_H);
    this.scrollY = Math.min(maxScroll, Math.max(0, playerY * SCALE - MAP_H / 2));

    ctx.fillStyle = "#93cf6f";
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    const box = (r: Rect, fill: string, stroke?: string) => {
      const [x, y, w, h] = this.rect(r);
      ctx.beginPath();
      ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    };

    for (const hall of HALLWAYS) box(hall, "#f3e9db");
    for (const room of ROOMS) {
      const isHere = room.id === currentRoomId;
      box(room.bounds, toCss(isHere ? room.color : shade(room.color, 0.6)), isHere ? "#ffffff" : undefined);
    }

    this.pulse = (this.pulse + 0.06) % (Math.PI * 2);

    // optional event: orange "!" badge (clamped to the edge when the room is off-screen)
    if (event) {
      const ex = this.mx(event.x);
      const ey = Math.min(MAP_H - 6, Math.max(6, this.my(event.y)));
      const r = 5.5 + Math.sin(this.pulse * 2) * 0.8;
      ctx.beginPath();
      ctx.arc(ex, ey, r, 0, Math.PI * 2);
      ctx.fillStyle = "#f5a524";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 8px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", ex, ey + 0.5);
    }

    // next case destination: pink pin
    if (quest) {
      const qx = this.mx(quest.x);
      const qy = Math.min(MAP_H - 4, Math.max(4, this.my(quest.y)));
      ctx.beginPath();
      ctx.arc(qx, qy, 4.5 + Math.sin(this.pulse * 1.5) * 1.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(240, 103, 158, 0.35)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(qx, qy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#f0679e";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.fill();
      ctx.stroke();
    }

    // player arrow with a soft pulsing halo
    const px = this.mx(playerX);
    const py = this.my(playerY);
    ctx.beginPath();
    ctx.arc(px, py, 5.5 + Math.sin(this.pulse) * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(232, 51, 63, 0.3)";
    ctx.fill();

    ctx.save();
    ctx.translate(px, py);
    // the arrow points up at 0; +90 turns a world angle (0 = right) into it
    ctx.rotate(((facingDeg + 90) * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fillStyle = "#e8333f";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
}
