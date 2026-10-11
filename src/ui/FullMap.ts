import { ROOMS, type RoomId } from "../data/rooms";

/** Full-screen map modal: tap a room to select it, then "Go Here" to teleport. */
export default class FullMap {
  private root: HTMLDivElement;
  private roomBoxes = new Map<RoomId, HTMLDivElement>();
  private detailLabel: HTMLParagraphElement;
  private goHereBtn: HTMLButtonElement;
  private selectedRoomId: RoomId | null = null;
  private currentRoomId: RoomId = "reception";
  private onGoHere: (roomId: RoomId) => void;

  constructor(parent: HTMLElement, onGoHere: (roomId: RoomId) => void) {
    this.onGoHere = onGoHere;

    this.root = document.createElement("div");
    this.root.className = "modal-overlay hidden fullmap-overlay";

    const card = document.createElement("div");
    card.className = "modal-card fullmap-card";

    const title = document.createElement("h2");
    title.textContent = "Clinic Map";

    const grid = document.createElement("div");
    grid.className = "fullmap-grid";

    for (const room of ROOMS) {
      const box = document.createElement("div");
      box.className = "fullmap-room";
      box.textContent = room.label;
      box.addEventListener("click", () => this.select(room.id));
      grid.appendChild(box);
      this.roomBoxes.set(room.id, box);
    }

    this.detailLabel = document.createElement("p");
    this.detailLabel.className = "fullmap-detail";

    const actions = document.createElement("div");
    actions.className = "fullmap-actions";

    this.goHereBtn = document.createElement("button");
    this.goHereBtn.className = "primary-btn";
    this.goHereBtn.textContent = "Go Here";
    this.goHereBtn.addEventListener("click", () => {
      if (this.selectedRoomId && this.selectedRoomId !== this.currentRoomId) {
        this.onGoHere(this.selectedRoomId);
        this.close();
      }
    });

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close-btn";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.close());

    actions.append(this.goHereBtn, closeBtn);
    card.append(title, grid, this.detailLabel, actions);
    this.root.appendChild(card);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    parent.appendChild(this.root);
  }

  private select(roomId: RoomId): void {
    this.selectedRoomId = roomId;
    const room = ROOMS.find((r) => r.id === roomId)!;
    this.roomBoxes.forEach((box, id) => box.classList.toggle("selected", id === roomId));

    const isCurrent = roomId === this.currentRoomId;
    this.detailLabel.textContent = isCurrent
      ? `${room.label} — you are here.`
      : `Selected: ${room.label}`;
    this.goHereBtn.disabled = isCurrent;
  }

  open(currentRoomId: RoomId): void {
    this.currentRoomId = currentRoomId;
    this.selectedRoomId = null;
    this.roomBoxes.forEach((box, id) => {
      box.classList.toggle("here", id === currentRoomId);
      box.classList.remove("selected");
    });
    this.detailLabel.textContent = "Tap a room to see details.";
    this.goHereBtn.disabled = true;
    this.root.classList.remove("hidden");
  }

  close(): void {
    this.root.classList.add("hidden");
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}
