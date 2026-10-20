import Overlay, { el } from "./case/Overlay";
import type { ProgressState } from "../systems/Progress";

export interface ShiftSummaryOptions {
  progress: Readonly<ProgressState>;
  level: number;
  /** True if the patient case was still open when the shift ended (it carries over). */
  caseOpen: boolean;
  onNextShift: () => void;
}

/**
 * End-of-shift result (brief sections 08 and 11): care points, optional event bonuses and
 * mini-game coins are shown as three separate ledgers. Closing it starts the next shift.
 */
export default class ShiftSummary {
  private overlay: Overlay;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "shift-summary");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(o: ShiftSummaryOptions): void {
    const p = o.progress;
    const t = p.current;
    this.overlay.setHeader({ title: `Shift ${p.shift} complete`, avatar: "🌇", subtitle: "Great work today!" });

    const section = (cls: string, icon: string, title: string, big: string, rows: [string, string][], note: string) => {
      const box = el("div", `shift-box ${cls}`);
      const head = el("div", "shift-box-head");
      head.append(el("span", "shift-box-icon", icon), el("strong", "", title), el("span", "shift-box-big", big));
      const list = el("ul");
      for (const [k, v] of rows) {
        const li = el("li");
        li.append(el("span", "", k), el("strong", "", v));
        list.append(li);
      }
      box.append(head, list, el("p", "shift-box-note", note));
      return box;
    };

    const care = section(
      "care",
      "💜",
      "Patient care",
      `${t.care} pts`,
      [
        ["Patients helped", String(t.casesCompleted)],
        ["XP from care", `+${t.caseXp}`],
      ],
      o.caseOpen ? "Your patient case is still open. It carries over to the next shift." : "Your main score. Counts toward a future fair ranking."
    );
    const events = section(
      "events",
      "❗",
      "Clinic help (bonus)",
      `+${t.eventCoins} 🪙`,
      [
        ["Events solved", String(t.eventsResolved)],
        ["Bonus XP", `+${t.eventXp}`],
      ],
      "Optional. Never affects care points."
    );
    const arcade = section("arcade", "🕹️", "Arcade", `+${t.arcadeCoins} 🪙`, [], "Mini-game coins are kept separate from care.");

    const totals = el("div", "shift-totals");
    totals.append(el("span", "", `⭐ Level ${o.level}`), el("span", "", `${p.xp} XP`), el("span", "", `🪙 ${p.coins}`), el("span", "", `💜 ${p.careTotal} care pts`));

    const next = el("button", "primary-btn wide", `☀️  Start shift ${p.shift + 1}`);
    next.addEventListener("click", () => this.overlay.close());

    this.overlay.body.replaceChildren(care, events, arcade, totals);
    this.overlay.footer.replaceChildren(next);
    // ✕ / Esc also starts the next shift, so the game can't get stuck between shifts
    this.overlay.open(() => o.onNextShift());
  }
}
