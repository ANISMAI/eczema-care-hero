/** Simple dismissible modal used for NPC/object interaction placeholder dialog. */
export default class Dialog {
  private root: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private textEl: HTMLParagraphElement;
  private onClose?: () => void;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "modal-overlay hidden";

    const card = document.createElement("div");
    card.className = "modal-card";

    this.titleEl = document.createElement("h2");
    this.textEl = document.createElement("p");

    const closeBtn = document.createElement("button");
    closeBtn.className = "modal-close-btn";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => this.close());

    card.append(this.titleEl, this.textEl, closeBtn);
    this.root.appendChild(card);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    parent.appendChild(this.root);
  }

  open(title: string, text: string, onClose?: () => void): void {
    this.titleEl.textContent = title;
    this.textEl.textContent = text;
    this.onClose = onClose;
    this.root.classList.remove("hidden");
  }

  close(): void {
    this.root.classList.add("hidden");
    this.onClose?.();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}
