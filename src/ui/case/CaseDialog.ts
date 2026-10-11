import Overlay, { el, feedback, type OverlayHeader } from "./Overlay";

/**
 * Short conversation panel (lines of speech), written as an async script. Every call resolves
 * to `false` if the player closes the panel, so a script can simply stop.
 */
export default class CaseDialog {
  private overlay: Overlay;
  private closed = false;
  private wake: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-dialog");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  /** Opens the panel; `onClose` runs once when it closes (finished or dismissed). */
  begin(header: OverlayHeader, onClose: () => void): void {
    this.closed = false;
    this.overlay.setHeader(header);
    this.overlay.body.replaceChildren();
    this.overlay.footer.replaceChildren();
    this.overlay.open(() => {
      this.closed = true;
      this.wake?.();
      onClose();
    });
  }

  setHeader(header: OverlayHeader): void {
    this.overlay.setHeader(header);
  }

  end(): void {
    this.overlay.close();
  }

  /** Shows a speech bubble and waits for the button. */
  async say(text: string, button = "Next", extra?: HTMLElement): Promise<boolean> {
    if (this.closed) return false;
    const bubble = el("div", "case-speech", text);
    this.overlay.body.replaceChildren(bubble);
    if (extra) this.overlay.body.appendChild(extra);
    return this.waitForButton(button);
  }

  /** Shows the outcome of a correct choice, then waits for Continue. */
  async confirm(text: string, tone: "good" | "info" = "good", button = "Continue"): Promise<boolean> {
    if (this.closed) return false;
    this.overlay.body.appendChild(feedback(text, tone));
    return this.waitForButton(button);
  }

  private waitForButton(label: string): Promise<boolean> {
    return new Promise((resolve) => {
      const btn = el("button", "primary-btn wide", label);
      btn.addEventListener("click", () => {
        this.wake = null;
        resolve(true);
      });
      this.overlay.footer.replaceChildren(btn);
      this.wake = () => resolve(false);
    });
  }
}
