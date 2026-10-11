import { el } from "../IdCard";

export interface OverlayHeader {
  title: string;
  /** Portrait image URL, or an emoji. */
  avatar: string;
  subtitle?: string;
}

/**
 * Base for the case interaction panels (brief section 07: reusable InteractionOverlay).
 * A modal card with a header, a body and a footer. Closing it (✕, Esc, or tapping outside
 * when allowed) calls `onClose` exactly once.
 */
export default class Overlay {
  readonly root: HTMLDivElement;
  readonly card: HTMLDivElement;
  readonly body: HTMLDivElement;
  readonly footer: HTMLDivElement;
  private avatar: HTMLSpanElement;
  private titleEl: HTMLHeadingElement;
  private subtitleEl: HTMLSpanElement;
  private onClose: (() => void) | null = null;

  constructor(parent: HTMLElement, className = "") {
    this.root = el("div", "modal-overlay hidden case-overlay");
    this.card = el("div", `modal-card case-card ${className}`);
    this.card.setAttribute("role", "dialog");

    const header = el("div", "modal-header case-header");
    this.avatar = el("span", "modal-avatar case-avatar");
    const titles = el("div", "case-titles");
    this.titleEl = el("h2");
    this.subtitleEl = el("span", "case-subtitle");
    titles.append(this.titleEl, this.subtitleEl);
    const close = el("button", "case-x", "✕");
    close.setAttribute("aria-label", "Close");
    close.addEventListener("click", () => this.close());
    header.append(this.avatar, titles, close);

    this.body = el("div", "case-body");
    this.footer = el("div", "case-footer");
    this.card.append(header, this.body, this.footer);
    this.root.appendChild(this.card);
    window.addEventListener("keydown", (e) => {
      if (this.isOpen && e.key === "Escape") this.close();
    });
    parent.appendChild(this.root);
  }

  setHeader(h: OverlayHeader): void {
    this.titleEl.textContent = h.title;
    this.card.setAttribute("aria-label", h.title);
    this.subtitleEl.textContent = h.subtitle ?? "";
    this.subtitleEl.classList.toggle("hidden", !h.subtitle);
    this.avatar.replaceChildren();
    if (h.avatar.includes("/")) {
      const img = el("img");
      img.src = h.avatar;
      img.alt = "";
      this.avatar.appendChild(img);
      this.avatar.classList.add("photo");
    } else {
      this.avatar.textContent = h.avatar;
      this.avatar.classList.remove("photo");
    }
  }

  open(onClose: () => void): void {
    this.onClose = onClose;
    this.root.classList.remove("hidden");
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    const cb = this.onClose;
    this.onClose = null;
    cb?.();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}

/** Small status line used for feedback ("good" / "bad" / "info"). */
export function feedback(text: string, tone: "good" | "bad" | "info"): HTMLDivElement {
  const box = el("div", `case-feedback ${tone}`);
  box.append(el("span", "case-feedback-icon", tone === "good" ? "✓" : tone === "bad" ? "!" : "i"), el("span", "", text));
  return box;
}

export { el };
