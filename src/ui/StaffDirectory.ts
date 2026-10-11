import { STAFF, type StaffCard } from "../data/staff";
import { getRoomById } from "../data/rooms";
import type { CharacterId } from "../data/assets";

export interface StaffDirectoryCallbacks {
  /** Take the player to this staff member. */
  onFind: (card: StaffCard) => void;
  onClose: () => void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Staff directory: one staff ID card at a time; swipe or use the arrows to browse. */
export default class StaffDirectory {
  private root: HTMLDivElement;
  private cardHost: HTMLDivElement;
  private dots: HTMLSpanElement[] = [];
  private findBtn: HTMLButtonElement;
  private counter: HTMLSpanElement;
  private index = 0;
  private playerCharacter: CharacterId | undefined;
  private callbacks: StaffDirectoryCallbacks;

  constructor(parent: HTMLElement, callbacks: StaffDirectoryCallbacks) {
    this.callbacks = callbacks;

    this.root = el("div", "modal-overlay hidden staff-overlay");
    const wrap = el("div", "staff-wrap");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Staff directory");

    const title = el("div", "staff-title");
    title.append(el("span", "", "👥"), el("span", "", "Staff Directory"));
    this.counter = el("span", "staff-counter");
    title.appendChild(this.counter);

    const stage = el("div", "staff-stage");
    const prev = el("button", "staff-arrow", "‹");
    prev.setAttribute("aria-label", "Previous staff");
    prev.addEventListener("click", () => this.show(this.index - 1, -1));
    const next = el("button", "staff-arrow", "›");
    next.setAttribute("aria-label", "Next staff");
    next.addEventListener("click", () => this.show(this.index + 1, 1));
    this.cardHost = el("div", "staff-card-host");
    stage.append(prev, this.cardHost, next);
    this.enableSwipe(this.cardHost);

    const dots = el("div", "staff-dots");
    STAFF.forEach((_, i) => {
      const d = el("span", "staff-dot");
      d.addEventListener("click", () => this.show(i, i > this.index ? 1 : -1));
      dots.appendChild(d);
      this.dots.push(d);
    });

    const actions = el("div", "modal-actions staff-actions");
    const closeBtn = el("button", "secondary-btn", "Close");
    closeBtn.addEventListener("click", () => this.close());
    this.findBtn = el("button", "primary-btn", "Find");
    this.findBtn.addEventListener("click", () => {
      const card = STAFF[this.index];
      this.close();
      this.callbacks.onFind(card);
    });
    actions.append(closeBtn, this.findBtn);

    wrap.append(title, stage, dots, actions);
    this.root.appendChild(wrap);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    window.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") this.close();
      if (e.key === "ArrowLeft") this.show(this.index - 1, -1);
      if (e.key === "ArrowRight") this.show(this.index + 1, 1);
    });
    parent.appendChild(this.root);
  }

  private enableSwipe(target: HTMLElement): void {
    let startX: number | null = null;
    target.addEventListener("pointerdown", (e) => (startX = e.clientX));
    target.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) this.show(this.index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    target.addEventListener("pointercancel", () => (startX = null));
  }

  private show(i: number, direction = 0): void {
    const n = STAFF.length;
    this.index = ((i % n) + n) % n;
    const card = STAFF[this.index];
    const node = this.renderCard(card);
    if (direction) node.classList.add(direction > 0 ? "enter-right" : "enter-left");
    this.cardHost.replaceChildren(node);
    this.dots.forEach((d, k) => d.classList.toggle("active", k === this.index));
    this.counter.textContent = `${this.index + 1} / ${n}`;

    const isYou = card.characterId !== undefined && card.characterId === this.playerCharacter;
    const offDuty = card.characterId !== undefined && !isYou;
    this.findBtn.disabled = isYou || offDuty;
    this.findBtn.textContent = isYou ? "That's you!" : offDuty ? "Off duty" : `Find ${card.name.split(" ")[0]}`;
  }

  private renderCard(card: StaffCard): HTMLDivElement {
    const isYou = card.characterId !== undefined && card.characterId === this.playerCharacter;
    const offDuty = card.characterId !== undefined && !isYou;

    const root = el("div", "id-card");
    root.style.setProperty("--accent", card.accent);

    // lanyard + clip
    root.append(el("span", "id-lanyard"), el("span", "id-clip"));

    const head = el("div", "id-head");
    const logo = el("span", "id-logo", "✚");
    const org = el("div", "id-org");
    org.append(el("span", "", "Eczema Care Clinic"), el("strong", "", "Staff ID"));
    head.append(logo, org);

    const photo = el("div", "id-photo");
    const portrait = el("img", "id-portrait");
    portrait.src = card.portrait;
    portrait.alt = card.name;
    portrait.draggable = false;
    photo.appendChild(portrait);
    if (isYou) photo.appendChild(el("span", "id-badge you", "You"));
    if (offDuty) photo.appendChild(el("span", "id-badge off", "Off duty today"));

    const name = el("h3", "id-name", card.name);
    const role = el("span", "id-role", card.role);

    const meta = el("div", "id-meta");
    const room = getRoomById(card.room);
    meta.append(el("span", "", `ID ${card.staffNo}`), el("span", "", `📍 ${room.label}`));

    const helpsTitle = el("div", "id-section", "Can help you with");
    const helps = el("ul", "id-helps");
    for (const h of card.helps) helps.appendChild(el("li", "", h));

    const aboutTitle = el("div", "id-section", "About me");
    const about = el("p", "id-about", `“${card.about}”`);

    const foot = el("div", "id-foot");
    foot.append(el("span", "id-barcode"), el("span", "id-valid", "Valid until 12/2027"));

    root.append(head, photo, name, role, meta, helpsTitle, helps, aboutTitle, about, foot);
    return root;
  }

  open(playerCharacter: CharacterId | undefined): void {
    this.playerCharacter = playerCharacter;
    this.root.classList.remove("hidden");
    this.show(this.index);
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
