import Overlay, { el } from "./case/Overlay";
import type { ProgressState } from "../systems/Progress";

export interface ShiftSummaryOptions {
  progress: Readonly<ProgressState>;
  level: number;
  onNextShift: () => void;
}

/**
 * End-of-day result (Phase 2 sections 08 and 11, Phase 3 section 9): care points, optional event
 * bonuses and mini-game coins are three separate ledgers; the doctor's patients (helped, left
 * while waiting, rebooked at closing) and the routine visitors Nurul and Grace looked after are
 * counted separately and never change the score. Closing it starts the next day.
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
    this.overlay.setHeader({ title: `Day ${p.shift} complete`, avatar: "🌇", subtitle: "The clinic is closed. Great work today!" });

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

    const rows: [string, string][] = [["Left while waiting", String(t.doctorLeft)]];
    if (t.doctorRebooked) rows.push(["Rebooked at closing", String(t.doctorRebooked)]);
    rows.push(["XP from care", `+${t.caseXp}`]);
    const care = section("care", "💜", "Patient care", `${t.care} pts`, rows, "Your main score. People who left or were rebooked never take points away.");

    // every patient helped today, then what the day's visits taught (no duplicates)
    const helped = el("div", "shift-box helped");
    const head = el("div", "shift-box-head");
    head.append(el("span", "shift-box-icon", "🩺"), el("strong", "", "Patients you helped"), el("span", "shift-box-big", String(t.visits.length)));
    helped.append(head);
    if (t.visits.length) {
      const list = el("ul", "helped-list");
      for (const v of t.visits) {
        const li = el("li");
        const face = el("span", "helped-face");
        if (v.portrait.includes("/")) {
          const img = el("img");
          img.src = v.portrait;
          img.alt = "";
          face.append(img);
        } else face.textContent = v.portrait;
        const text = el("span", "helped-text");
        text.append(el("strong", "", v.name), el("span", "", v.title));
        const pts = el("strong", v.points >= v.maxPoints ? "helped-pts full" : "helped-pts", `+${v.points}`);
        li.append(face, text, pts);
        list.append(li);
      }
      helped.append(list);
    } else {
      helped.append(el("p", "shift-box-note", "No patients were seen today. Call the next patient in at the Consultation desk."));
    }
    const lessons = [...new Set(t.visits.map((v) => v.takeaway))];
    const takeaways = el("div", "result-takeaway");
    takeaways.append(el("strong", "", "💡 What today's visits taught"));
    for (const line of lessons) takeaways.append(el("p", "", line));

    const traffic = section(
      "traffic",
      "🏥",
      "Clinic visitors",
      String(t.doctorArrivals + t.serviceArrivals),
      [
        ["Came to see the doctor", String(t.doctorArrivals)],
        ["Helped by Nurul & Grace", String(t.serviceServed)],
      ],
      "Routine visits are handled by the team and don't affect your score."
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

    const next = el("button", "primary-btn wide", `☀️  Start day ${p.shift + 1}`);
    next.addEventListener("click", () => this.overlay.close());

    this.overlay.body.replaceChildren(care, helped, ...(lessons.length ? [takeaways] : []), traffic, events, arcade, totals);
    this.overlay.footer.replaceChildren(next);
    // ✕ / Esc also starts the next day, so the game can't get stuck between days
    this.overlay.open(() => o.onNextShift());
  }
}
