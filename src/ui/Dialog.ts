/** Simple dismissible modal used for NPC/object interaction placeholder dialog. */
export default class Dialog {
  private root: HTMLDivElement;
  private avatarEl: HTMLSpanElement;
  private titleEl: HTMLHeadingElement;
  private textEl: HTMLParagraphElement;
  private onClose?: () => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "modal-overlay hidden";

    const card = document.createElement("div");
    card.className = "modal-card dialog-card";
    card.setAttribute("role", "dialog");

    const header = document.createElement("div");
    header.className = "modal-header";
    this.avatarEl = document.createElement("span");
    this.avatarEl.className = "modal-avatar";
    this.titleEl = document.createElement("h2");
    header.append(this.avatarEl, this.titleEl);

    this.textEl = document.createElement("p");

    const closeBtn = document.createElement("button");
    closeBtn.className = "primary-btn wide";
    closeBtn.textContent = "OK";
    closeBtn.addEventListener("click", () => this.close());

    card.append(header, this.textEl, closeBtn);
    this.root.appendChild(card);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    window.addEventListener("keydown", (e) => {
      if (this.isOpen && (e.key === "Escape" || e.key === "Enter")) this.close();
    });
    parent.appendChild(this.root);
  }

  open(title: string, text: string, icon: string, onClose?: () => void): void {
    this.avatarEl.textContent = icon;
    this.titleEl.textContent = title;
    this.textEl.textContent = text;
    this.onClose = onClose;
    this.root.classList.remove("hidden");
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    const cb = this.onClose;
    this.onClose = undefined;
    cb?.();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}
