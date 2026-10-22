import { ROOMS, HALLWAYS, ENTRANCE, WORLD_BOUNDS, type Point, type Rect, type RoomId } from "../data/rooms";
import { shade, toCss } from "../art/palette";
import { t } from "../game/i18n";

export interface FullMapCallbacks {
  onGoHere: (roomId: RoomId) => void;
  onClose: () => void;
}

const W = WORLD_BOUNDS.width;
const H = WORLD_BOUNDS.height;
const pct = (v: number) => `${v * 100}%`;

/**
 * Full map modal: the clinic seen from above. Tap a room to select it, then Go Here to travel.
 *
 * The picture is a snapshot of the real game world taken as the map opens (setPhoto), so the
 * furniture and the people in each room show, like a town map; each room carries a small name
 * tag. Until the snapshot arrives (or if it fails) the plain coloured floor plan is shown.
 * On a landscape screen the map and the details sit side by side, so nothing needs scrolling.
 *
 * The plan is drawn as in the game (entrance at the bottom). It is only turned 90° when its
 * shape and the screen's disagree (a tall building on a landscape screen), so it never shrinks
 * to a thin strip. The current lobby-and-two-hallways clinic is wider than tall: never turned.
 */
export default class FullMap {
  private root: HTMLDivElement;
  private card: HTMLDivElement;
  private map: HTMLDivElement;
  private photo: HTMLImageElement;
  private halls: HTMLDivElement[] = [];
  private entrance: HTMLDivElement;
  private roomEls = new Map<RoomId, HTMLButtonElement>();
  private youPin: HTMLDivElement;
  private detailIcon: HTMLSpanElement;
  private detailName: HTMLElement;
  private detailText: HTMLSpanElement;
  private goHereBtn: HTMLButtonElement;
  private selectedRoomId: RoomId | null = null;
  private currentRoomId: RoomId | null = null;
  private playerPos: Point = { x: 0, y: 0 };
  private rotated = false;
  private callbacks: FullMapCallbacks;

  constructor(parent: HTMLElement, callbacks: FullMapCallbacks) {
    this.callbacks = callbacks;

    this.root = document.createElement("div");
    this.root.className = "modal-overlay hidden";

    this.card = document.createElement("div");
    this.card.className = "modal-card fullmap-card";
    this.card.setAttribute("role", "dialog");
    this.card.setAttribute("aria-label", "Clinic map");

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<span class="modal-avatar">🗺️</span><h2>${t("map.title")}</h2>`;

    this.map = document.createElement("div");
    this.map.className = "fm-map";
    this.photo = document.createElement("img");
    this.photo.className = "fm-photo";
    this.photo.alt = "";
    this.photo.draggable = false;
    this.map.appendChild(this.photo);

    for (let i = 0; i < HALLWAYS.length; i++) {
      const hall = document.createElement("div");
      hall.className = "fm-hall";
      this.map.appendChild(hall);
      this.halls.push(hall);
    }

    this.entrance = document.createElement("div");
    this.entrance.className = "fm-entrance";
    this.entrance.textContent = t("map.entrance");
    this.map.appendChild(this.entrance);

    for (const room of ROOMS) {
      const el = document.createElement("button");
      el.className = "fm-room";
      el.setAttribute("aria-label", room.label);
      el.style.setProperty("--room", toCss(room.color));
      el.style.setProperty("--room-soft", toCss(shade(room.color, 0.62)));
      el.innerHTML = `<span class="fm-room-inner"><span class="fm-room-icon">${room.icon}</span><span class="fm-room-label">${room.label}</span></span><span class="fm-event-badge" aria-hidden="true">!</span>`;
      el.addEventListener("click", () => this.select(room.id));
      this.map.appendChild(el);
      this.roomEls.set(room.id, el);
    }

    this.youPin = document.createElement("div");
    this.youPin.className = "fm-you";
    this.youPin.innerHTML = `<span class="fm-you-dot"></span><span class="fm-you-label">${t("map.youAreHere")}</span>`;
    this.map.appendChild(this.youPin);

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
    closeBtn.textContent = t("map.close");
    closeBtn.addEventListener("click", () => this.close());

    this.goHereBtn = document.createElement("button");
    this.goHereBtn.className = "primary-btn";
    this.goHereBtn.textContent = t("map.goHere");
    this.goHereBtn.addEventListener("click", () => {
      const target = this.selectedRoomId;
      if (!target || target === this.currentRoomId) return;
      this.close();
      this.callbacks.onGoHere(target);
    });

    actions.append(closeBtn, this.goHereBtn);
    const footer = document.createElement("div");
    footer.className = "fm-footer";
    footer.append(detail, actions);
    const body = document.createElement("div");
    body.className = "fm-body";
    body.append(this.map, footer);
    this.card.append(header, body);
    this.root.appendChild(this.card);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    window.addEventListener("keydown", (e) => {
      if (this.isOpen && e.key === "Escape") this.close();
    });
    window.addEventListener("resize", () => {
      if (this.isOpen) this.layout();
    });
    parent.appendChild(this.root);
  }

  /** Positions everything for the current screen orientation. */
  private layout(): void {
    this.rotated = window.innerWidth > window.innerHeight && H > W;
    this.card.classList.toggle("rotated", this.rotated);
    this.map.style.aspectRatio = this.rotated ? `${H} / ${W}` : `${W} / ${H}`;

    HALLWAYS.forEach((hall, i) => this.place(this.halls[i], hall));
    for (const room of ROOMS) this.place(this.roomEls.get(room.id)!, room.bounds);

    // "Entrance" tag just outside the lobby's front door
    const door = this.toMap({ x: ENTRANCE.x, y: ENTRANCE.y + 40 });
    this.entrance.style.left = pct(door.x);
    this.entrance.style.top = pct(door.y);

    const you = this.toMap(this.playerPos);
    this.youPin.style.left = pct(you.x);
    this.youPin.style.top = pct(you.y);
  }

  /** World point -> fraction of the map box (0..1), honouring the rotation. */
  private toMap(p: Point): Point {
    return this.rotated ? { x: 1 - p.y / H, y: p.x / W } : { x: p.x / W, y: p.y / H };
  }

  private place(el: HTMLElement, r: Rect): void {
    if (this.rotated) {
      el.style.left = pct(1 - (r.y + r.height) / H);
      el.style.top = pct(r.x / W);
      el.style.width = pct(r.height / H);
      el.style.height = pct(r.width / W);
    } else {
      el.style.left = pct(r.x / W);
      el.style.top = pct(r.y / H);
      el.style.width = pct(r.width / W);
      el.style.height = pct(r.height / H);
    }
  }

  private select(roomId: RoomId): void {
    this.selectedRoomId = roomId;
    const room = ROOMS.find((r) => r.id === roomId)!;
    this.roomEls.forEach((el, id) => el.classList.toggle("selected", id === roomId));

    const isCurrent = roomId === this.currentRoomId;
    this.detailIcon.textContent = room.icon;
    this.detailName.textContent = room.label;
    const help = this.roomEls.get(roomId)!.classList.contains("event") ? t("map.help") : "";
    this.detailText.textContent = (isCurrent ? t("map.alreadyHere") : room.description) + help;
    this.goHereBtn.disabled = isCurrent || !room.accessible;
  }

  /** `questRoom`: where the active case needs the player next (shown with a "NEXT" tag). */
  /** `prayerRoom`: marked with 🕌 during a prayer time (optional reminder). */
  /** `eventRoom`: an optional clinic event is waiting there (orange "!"). */
  open(
    currentRoomId: RoomId | null,
    playerPos: Point,
    questRoom: RoomId | null = null,
    prayerRoom: RoomId | null = null,
    eventRoom: RoomId | null = null
  ): void {
    this.currentRoomId = currentRoomId;
    this.selectedRoomId = null;
    this.playerPos = { ...playerPos };
    this.roomEls.forEach((el, id) => {
      el.classList.toggle("here", id === currentRoomId);
      el.classList.toggle("quest", id === questRoom);
      el.classList.toggle("prayer", id === prayerRoom);
      el.classList.toggle("event", id === eventRoom);
      el.setAttribute("aria-label", `${ROOMS.find((r) => r.id === id)!.label}${id === eventRoom ? " (help needed)" : ""}`);
      el.classList.remove("selected");
    });

    const here = ROOMS.find((r) => r.id === currentRoomId);
    this.detailIcon.textContent = "👆";
    this.detailName.textContent = t("map.choose");
    this.detailText.textContent = here ? t("map.youAreIn", { room: here.label }) : t("map.tapRoom");
    this.goHereBtn.disabled = true;
    this.map.classList.remove("photo");
    this.root.classList.remove("hidden");
    this.layout();
  }

  /** The clinic seen from above (a snapshot of the game world), or null for the plain plan. */
  setPhoto(src: string | null): void {
    if (!src || !this.isOpen) return;
    this.photo.onload = () => this.map.classList.add("photo");
    this.photo.src = src;
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
