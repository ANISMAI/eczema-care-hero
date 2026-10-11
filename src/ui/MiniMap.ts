import { ROOMS, HALLWAY, WORLD_BOUNDS, type RoomId } from "../data/rooms";
import { shade, toCss } from "../art/palette";

// CSS size of the mini-map; keeps the world's portrait aspect ratio.
const MAP_W = 74;
const MAP_H = Math.round((MAP_W * WORLD_BOUNDS.height) / WORLD_BOUNDS.width);

/** Always-visible top-right mini-map: simplified room shapes + a moving player arrow. */
export default class MiniMap {
  private ctx: CanvasRenderingContext2D;
  private dpr = Math.min(3, window.devicePixelRatio || 1);
  private pulse = 0;

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

  private sx(x: number): number {
    return (x / WORLD_BOUNDS.width) * MAP_W;
  }

  private sy(y: number): number {
    return (y / WORLD_BOUNDS.height) * MAP_H;
  }

  draw(playerX: number, playerY: number, currentRoomId: RoomId, facingDeg: number): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, MAP_W, MAP_H);

    ctx.fillStyle = "#93cf6f";
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    const box = (x: number, y: number, w: number, h: number, fill: string, stroke?: string) => {
      ctx.beginPath();
      ctx.roundRect(this.sx(x) + 0.5, this.sy(y) + 0.5, this.sx(w) - 1, this.sy(h) - 1, 2);
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = stroke;
        ctx.stroke();
      }
    };

    box(HALLWAY.x, HALLWAY.y, HALLWAY.width, HALLWAY.height, "#f3e9db");
    for (const room of ROOMS) {
      const { x, y, width, height } = room.bounds;
      const isHere = room.id === currentRoomId;
      box(x, y, width, height, toCss(isHere ? room.color : shade(room.color, 0.6)), isHere ? "#ffffff" : undefined);
    }

    // player arrow with a soft pulsing halo
    this.pulse = (this.pulse + 0.06) % (Math.PI * 2);
    const px = this.sx(playerX);
    const py = this.sy(playerY);
    ctx.beginPath();
    ctx.arc(px, py, 5.5 + Math.sin(this.pulse) * 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(232, 51, 63, 0.3)";
    ctx.fill();

    ctx.save();
    ctx.translate(px, py);
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
