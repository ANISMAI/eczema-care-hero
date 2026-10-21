import Overlay, { el, feedback, type OverlayHeader } from "../case/Overlay";
import { COMEDY } from "../../data/gameplay";
import { t } from "../../game/i18n";
import type { EventOutcome, EventPanel, EventRewards } from "../../events/types";

/** Shared cancellation, focus and timer cleanup for the two short comedy incidents. */
export default abstract class IncidentPanel implements EventPanel {
  protected overlay: Overlay;
  protected rewards: EventRewards = { coins: 0, xp: 0 };
  protected outcome: EventOutcome = "later";
  private timers = new Set<number>();
  private previousFocus: HTMLElement | null = null;

  constructor(parent: HTMLElement, className: string) {
    this.overlay = new Overlay(parent, `event-panel incident-panel ${className}`);
    this.overlay.card.setAttribute("aria-modal", "true");
    this.overlay.card.querySelector(".case-x")?.setAttribute("aria-label", t("map.close"));
    this.overlay.root.addEventListener("keydown", e => {
      if (e.key !== "Tab") return;
      const buttons = Array.from(this.overlay.card.querySelectorAll<HTMLButtonElement>("button"))
        .filter(b => !b.disabled && b.offsetParent !== null);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      e.preventDefault();
      buttons[next]?.focus({ preventScroll: true });
    });
  }

  abstract open(seed: number, rewards: EventRewards, done: (outcome: EventOutcome) => void, occurrence?: number): void;

  get isOpen(): boolean { return this.overlay.isOpen; }

  protected begin(header: OverlayHeader, rewards: EventRewards, done: (outcome: EventOutcome) => void): void {
    this.clearTimers();
    this.rewards = rewards;
    this.outcome = "later";
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.overlay.setHeader(header);
    const later = el("button", "secondary-btn", t("event.later"));
    later.addEventListener("click", () => this.overlay.close());
    const skip = el("button", "secondary-btn incident-skip", t("incident.skip"));
    skip.addEventListener("click", () => {
      this.outcome = "dismissed";
      this.overlay.close();
    });
    this.overlay.footer.replaceChildren(later, skip);
    this.overlay.open(() => {
      this.clearTimers();
      this.previousFocus?.focus({ preventScroll: true });
      done(this.outcome);
    });
    this.after(() => {
      this.outcome = "expired";
      this.overlay.close();
    }, COMEDY.staffResolveMs);
    later.focus({ preventScroll: true });
  }

  protected after(callback: () => void, ms: number): void {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      if (this.isOpen) callback();
    }, ms);
    this.timers.add(timer);
  }

  protected every(callback: () => void, ms: number): void {
    this.timers.add(window.setInterval(() => { if (this.isOpen) callback(); }, ms));
  }

  private clearTimers(): void {
    this.timers.forEach(timer => window.clearTimeout(timer));
    this.timers.clear();
  }

  protected success(message: string): void {
    this.clearTimers();
    this.outcome = "resolved";
    const done = el("button", "primary-btn wide incident-done", t("menu.done"));
    done.addEventListener("click", () => this.overlay.close());
    this.overlay.body.replaceChildren(el("div", "case-speech", message),
      feedback(t("incident.reward", { coins: this.rewards.coins, xp: this.rewards.xp }), "good"));
    this.overlay.footer.replaceChildren(done);
    done.focus({ preventScroll: true });
  }

  close(): void {
    this.outcome = "dismissed";
    this.overlay.close();
    this.clearTimers();
  }
}
