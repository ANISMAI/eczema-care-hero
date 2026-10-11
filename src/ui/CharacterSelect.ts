import { CHARACTERS, type CharacterId } from "../data/assets";
import { spritePortrait } from "./spritePortrait";

/** Character picker. On first launch it must be answered; later it can be cancelled. */
export default class CharacterSelect {
  private root: HTMLDivElement;
  private cards = new Map<CharacterId, HTMLButtonElement>();
  private cancelBtn: HTMLButtonElement;
  private confirmBtn: HTMLButtonElement;
  private selected: CharacterId = CHARACTERS[0].id;
  private required = false;
  private onPick: (id: CharacterId) => void;
  private onCancel: () => void;

  constructor(parent: HTMLElement, onPick: (id: CharacterId) => void, onCancel: () => void) {
    this.onPick = onPick;
    this.onCancel = onCancel;

    this.root = document.createElement("div");
    this.root.className = "modal-overlay hidden";

    const card = document.createElement("div");
    card.className = "modal-card select-card";
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-label", "Choose your doctor");

    const header = document.createElement("div");
    header.className = "modal-header";
    header.innerHTML = `<span class="modal-avatar">🩺</span><h2>Choose your doctor</h2>`;

    const grid = document.createElement("div");
    grid.className = "cs-grid";
    for (const c of CHARACTERS) {
      const btn = document.createElement("button");
      btn.className = "cs-card";
      btn.setAttribute("aria-label", c.label);
      const stage = document.createElement("span");
      stage.className = "cs-stage";
      const portrait = document.createElement("span");
      portrait.className = "cs-portrait";
      spritePortrait(portrait, c.sheet, c.sheet.rows.down * 3, 132);
      stage.appendChild(portrait);
      const label = document.createElement("span");
      label.className = "cs-label";
      label.textContent = c.label;
      btn.append(stage, label);
      btn.addEventListener("click", () => this.select(c.id));
      btn.addEventListener("dblclick", () => this.confirm());
      grid.appendChild(btn);
      this.cards.set(c.id, btn);
    }

    const actions = document.createElement("div");
    actions.className = "modal-actions";
    this.cancelBtn = document.createElement("button");
    this.cancelBtn.className = "secondary-btn";
    this.cancelBtn.textContent = "Cancel";
    this.cancelBtn.addEventListener("click", () => this.cancel());
    this.confirmBtn = document.createElement("button");
    this.confirmBtn.className = "primary-btn";
    this.confirmBtn.addEventListener("click", () => this.confirm());
    actions.append(this.cancelBtn, this.confirmBtn);

    card.append(header, grid, actions);
    this.root.appendChild(card);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.cancel();
    });
    window.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") this.cancel();
      if (e.key === "Enter") this.confirm();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const i = CHARACTERS.findIndex((c) => c.id === this.selected);
        const n = CHARACTERS.length;
        this.select(CHARACTERS[(i + (e.key === "ArrowRight" ? 1 : n - 1)) % n].id);
      }
    });
    parent.appendChild(this.root);
  }

  private select(id: CharacterId): void {
    this.selected = id;
    this.cards.forEach((el, cid) => el.classList.toggle("selected", cid === id));
  }

  /** `required`: first launch — no cancel, button reads "Start". */
  open(current: CharacterId | undefined, required: boolean): void {
    this.required = required;
    this.select(current ?? CHARACTERS[0].id);
    this.cancelBtn.classList.toggle("hidden", required);
    this.confirmBtn.textContent = required ? "Start" : "Choose";
    this.root.classList.remove("hidden");
  }

  private confirm(): void {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.onPick(this.selected);
  }

  private cancel(): void {
    if (!this.isOpen || this.required) return;
    this.root.classList.add("hidden");
    this.onCancel();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}
