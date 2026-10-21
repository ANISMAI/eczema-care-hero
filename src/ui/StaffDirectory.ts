import { STAFF, type StaffCard } from "../data/staff";
import type { CharacterId } from "../data/assets";
import { cardCloseButton, el, renderIdCard } from "./IdCard";
import { t } from "../game/i18n";

export interface StaffDirectoryCallbacks {
  /** Take the player to this staff member. */
  onFind: (card: StaffCard) => void;
  onClose: () => void;
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
  /** Cards shown this time: everyone except the player's own doctor (that's their profile). */
  private cards: StaffCard[] = STAFF;
  private dotsRow!: HTMLDivElement;
  private callbacks: StaffDirectoryCallbacks;

  constructor(parent: HTMLElement, callbacks: StaffDirectoryCallbacks) {
    this.callbacks = callbacks;

    this.root = el("div", "modal-overlay hidden staff-overlay");
    const wrap = el("div", "staff-wrap");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Staff directory");

    const title = el("div", "staff-title");
    title.append(el("span", "", "👥"), el("span", "", t("staff.title")));
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
    const frame = el("div", "staff-card-frame");
    frame.append(this.cardHost, cardCloseButton(() => this.close()));
    stage.append(prev, frame, next);
    this.enableSwipe(this.cardHost);

    const dots = el("div", "staff-dots");
    this.dotsRow = dots;

    const actions = el("div", "modal-actions staff-actions");
    this.findBtn = el("button", "primary-btn", "Find");
    this.findBtn.addEventListener("click", () => {
      const card = this.cards[this.index];
      this.close();
      this.callbacks.onFind(card);
    });
    actions.append(this.findBtn);

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
    const n = this.cards.length;
    this.index = ((i % n) + n) % n;
    const card = this.cards[this.index];
    const node = renderIdCard(card, { badge: card.characterId ? "off" : undefined });
    if (direction) node.classList.add(direction > 0 ? "enter-right" : "enter-left");
    this.cardHost.replaceChildren(node);
    this.dots.forEach((d, k) => d.classList.toggle("active", k === this.index));
    this.counter.textContent = `${this.index + 1} / ${n}`;

    // the other doctor (the one not being played) isn't in the clinic today
    const offDuty = card.characterId !== undefined;
    this.findBtn.disabled = offDuty;
    this.findBtn.textContent = offDuty ? t("staff.offDuty") : t("staff.find", { name: card.name.split(" ")[0] });
  }

  open(playerCharacter: CharacterId | undefined): void {
    if (playerCharacter !== this.playerCharacter || !this.dots.length) {
      this.playerCharacter = playerCharacter;
      this.cards = STAFF.filter((c) => !c.characterId || c.characterId !== playerCharacter);
      this.dots = this.cards.map((_, i) => {
        const d = el("span", "staff-dot");
        d.addEventListener("click", () => this.show(i, i > this.index ? 1 : -1));
        return d;
      });
      this.dotsRow.replaceChildren(...this.dots);
      this.index = 0;
    }
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
