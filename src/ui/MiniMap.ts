import { ROOMS, WORLD_BOUNDS, type RoomId } from "../data/rooms";

const MAP_W = 96;
const MAP_H = 70;

/** Always-visible top-right mini-map: simplified room boxes + a moving player dot. */
export default class MiniMap {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(parent: HTMLElement, onTap: () => void) {
    const wrapper = document.createElement("div");
    wrapper.className = "minimap-wrapper";

    this.canvas = document.createElement("canvas");
    this.canvas.width = MAP_W;
    this.canvas.height = MAP_H;
    this.canvas.className = "minimap-canvas";
    this.ctx = this.canvas.getContext("2d")!;

    wrapper.appendChild(this.canvas);
    wrapper.addEventListener("click", onTap);
    parent.appendChild(wrapper);
  }

  private toMap(x: number, y: number): [number, number] {
    return [(x / WORLD_BOUNDS.width) * MAP_W, (y / WORLD_BOUNDS.height) * MAP_H];
  }

  draw(playerX: number, playerY: number, currentRoomId: RoomId): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, MAP_W, MAP_H);
    ctx.fillStyle = "#241a3d";
    ctx.fillRect(0, 0, MAP_W, MAP_H);

    for (const room of ROOMS) {
      const [x, y] = this.toMap(room.bounds.x, room.bounds.y);
      const w = (room.bounds.width / WORLD_BOUNDS.width) * MAP_W;
      const h = (room.bounds.height / WORLD_BOUNDS.height) * MAP_H;
      ctx.fillStyle = room.id === currentRoomId ? "#ffd166" : "#6c5b9c";
      ctx.fillRect(x, y, w, h);
    }

    const [px, py] = this.toMap(playerX, playerY);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
