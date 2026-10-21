import Overlay, { el } from "./case/Overlay";
import type { ProgressState } from "../systems/Progress";
import { t as tr } from "../game/i18n";

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
    this.overlay.setHeader({ title: tr("summary.title", { day: p.shift }), avatar: "🌇", subtitle: tr("summary.subtitle") });

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

    const rows: [string, string][] = [[tr("summary.left"), String(t.doctorLeft)]];
    if (t.doctorRebooked) rows.push([tr("summary.rebooked"), String(t.doctorRebooked)]);
    rows.push([tr("summary.careXp"), `+${t.caseXp}`]);
    const care = section("care", "💜", tr("summary.care"), `${t.care} pts`, rows, tr("summary.careNote"));

    // every patient helped today, then what the day's visits taught (no duplicates)
    const helped = el("div", "shift-box helped");
    const head = el("div", "shift-box-head");
    head.append(el("span", "shift-box-icon", "🩺"), el("strong", "", tr("summary.helped")), el("span", "shift-box-big", String(t.visits.length)));
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
      helped.append(el("p", "shift-box-note", tr("summary.none")));
    }
    const lessons = [...new Set(t.visits.map((v) => v.takeaway))];
    const takeaways = el("div", "result-takeaway");
    takeaways.append(el("strong", "", tr("summary.taught")));
    for (const line of lessons) takeaways.append(el("p", "", line));

    const traffic = section(
      "traffic",
      "🏥",
      tr("summary.visitors"),
      String(t.doctorArrivals + t.serviceArrivals),
      [
        [tr("summary.cameDoctor"), String(t.doctorArrivals)],
        [tr("summary.helpedTeam"), String(t.serviceServed)],
      ],
      tr("summary.visitorsNote")
    );
    const events = section(
      "events",
      "❗",
      tr("summary.events"),
      `+${t.eventCoins} 🪙`,
      [
        [tr("summary.eventsSolved"), String(t.eventsResolved)],
        [tr("summary.bonusXp"), `+${t.eventXp}`],
      ],
      tr("summary.eventsNote")
    );
    const arcade = section("arcade", "🕹️", tr("summary.arcade"), `+${t.arcadeCoins} 🪙`, [], tr("summary.arcadeNote"));

    const totals = el("div", "shift-totals");
    totals.append(el("span", "", `⭐ ${tr("summary.level", { n: o.level })}`), el("span", "", `${p.xp} XP`), el("span", "", `🪙 ${p.coins}`), el("span", "", `💜 ${tr("summary.carePts", { n: p.careTotal })}`));

    const next = el("button", "primary-btn wide", tr("summary.nextDay", { day: p.shift + 1 }));
    next.addEventListener("click", () => this.overlay.close());

    this.overlay.body.replaceChildren(care, helped, ...(lessons.length ? [takeaways] : []), traffic, events, arcade, totals);
    this.overlay.footer.replaceChildren(next);
    // ✕ / Esc also starts the next day, so the game can't get stuck between days
    this.overlay.open(() => o.onNextShift());
  }
}
