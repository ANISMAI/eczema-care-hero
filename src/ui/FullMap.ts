import { ROOMS, HALLWAY, WORLD_BOUNDS, type Point, type RoomId } from "../data/rooms";
import { shade, toCss } from "../art/palette";

export interface FullMapCallbacks {
  onGoHere: (roomId: RoomId) => void;
  onClose: () => void;
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/** Full map modal: a scaled floor plan. Tap a room to select it, then Go Here to travel. */
export default class FullMap {
  private root: HTMLDivElement;
  private roomEls = new Map<RoomId, HTMLButtonElement>();
  private youPin: HTMLDivElement;
  private detailIcon: HTMLSpanElement;
  private detailName: HTMLElement;
  private detailText: HTMLSpanElement;
  private goHereBtn: HTMLButtonElement;
  private selectedRoomId: RoomId | null = null;
  private currentRoomId: RoomId | null = null;
  private callbacks: FullMapCallbacks;

  constructor(parent: HTMLElement, callbacks: FullMapCallbacks) {
    this.callbacks = callbacks;

    this.root = document.createElement("div");
    this.root.className = "modal-overlay hidden";

    const card = document.createElement("div");
    card.className = "modal-card fullmap-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Clinic map");

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<span class="modal-avatar">🗺️</span><h2>Clinic Map</h2>`;

    const map = document.createElement("div");
    map.className = "fm-map";
    map.style.aspectRatio = `${WORLD_BOUNDS.width} / ${WORLD_BOUNDS.height}`;

    const hall = document.createElement("div");
    hall.className = "fm-hall";
    this.place(hall, HALLWAY.x, HALLWAY.y, HALLWAY.width, HALLWAY.height);
    map.appendChild(hall);

    for (const room of ROOMS) {
      const el = document.createElement("button");
      el.className = "fm-room";
      el.style.setProperty("--room", toCss(room.color));
      el.style.setProperty("--room-soft", toCss(shade(room.color, 0.55)));
      el.style.setProperty("--room-dark", toCss(shade(room.color, -0.35)));
      el.innerHTML = `<span class="fm-room-icon">${room.icon}</span><span class="fm-room-label">${room.label}</span>`;
      this.place(el, room.bounds.x, room.bounds.y, room.bounds.width, room.bounds.height);
      el.addEventListener("click", () => this.select(room.id));
      map.appendChild(el);
      this.roomEls.set(room.id, el);
    }

    this.youPin = document.createElement("div");
    this.youPin.className = "fm-you";
    this.youPin.innerHTML = `<span class="fm-you-dot"></span><span class="fm-you-label">You are here</span>`;
    map.appendChild(this.youPin);

    const detail = document.createElement("div");
    detail.className = "fm-detail";
    this.detailIcon = document.createElement("span");
    this.detailIcon.className = "fm-detail-icon";
    const detailBody = document.createElement("div");
    this.detailName = document.createElement("strong");
    this.detailText = document.createElement("span");
    detailBody.append(this.detailName, this.detailText);
    detail.append(this.detailIcon, detailBody);

    const actions = document.createElement("div");
    actions.className = "modal-actions";

    const closeBtn = document.createElement("button");
    closeBtn.className = "secondary-btn";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.close());

    this.goHereBtn = document.createElement("button");
    this.goHereBtn.className = "primary-btn";
    this.goHereBtn.textContent = "Go Here";
    this.goHereBtn.addEventListener("click", () => {
      const target = this.selectedRoomId;
      if (!target || target === this.currentRoomId) return;
      this.close();
      this.callbacks.onGoHere(target);
    });

    actions.append(closeBtn, this.goHereBtn);
    card.append(header, map, detail, actions);
    this.root.appendChild(card);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    window.addEventListener("keydown", (e) => {
      if (this.isOpen && e.key === "Escape") this.close();
    });
    parent.appendChild(this.root);
  }

  private place(el: HTMLElement, x: number, y: number, w: number, h: number): void {
    el.style.left = pct(x, WORLD_BOUNDS.width);
    el.style.top = pct(y, WORLD_BOUNDS.height);
    el.style.width = pct(w, WORLD_BOUNDS.width);
    el.style.height = pct(h, WORLD_BOUNDS.height);
  }

  private select(roomId: RoomId): void {
    this.selectedRoomId = roomId;
    const room = ROOMS.find((r) => r.id === roomId)!;
    this.roomEls.forEach((el, id) => el.classList.toggle("selected", id === roomId));

    const isCurrent = roomId === this.currentRoomId;
    this.detailIcon.textContent = room.icon;
    this.detailName.textContent = room.label;
    this.detailText.textContent = isCurrent ? "You are already here." : room.description;
    this.goHereBtn.disabled = isCurrent || !room.accessible;
  }

  open(currentRoomId: RoomId | null, playerPos: Point): void {
    this.currentRoomId = currentRoomId;
    this.selectedRoomId = null;
    this.roomEls.forEach((el, id) => {
      el.classList.toggle("here", id === currentRoomId);
      el.classList.remove("selected");
    });
    this.youPin.style.left = pct(playerPos.x, WORLD_BOUNDS.width);
    this.youPin.style.top = pct(playerPos.y, WORLD_BOUNDS.height);

    this.detailIcon.textContent = "👆";
    this.detailName.textContent = "Choose a destination";
    this.detailText.textContent = "Tap a room on the map.";
    this.goHereBtn.disabled = true;
    this.root.classList.remove("hidden");
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.callbacks.onClose();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}
