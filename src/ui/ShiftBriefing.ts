import Overlay, { el } from "./case/Overlay";
import { t } from "../game/i18n";

export interface BriefingOptions {
  day: number;
  time: string;
  doctor: { name: string; portrait: string };
  trays: { clean: number; total: number };
  prayerReminders: boolean;
  onStart: () => void;
  onChangeDoctor: () => void;
  /** Closed without starting (to look around first). */
  onExplore: () => void;
}

/**
 * The card shown after entering the clinic, before the day starts: today's doctor (with a
 * Change doctor button), a few facts about the day, and a big Start shift button. Closing it
 * (Explore first / ✕ / Esc) leaves the clinic closed; the HUD then shows a Start shift button.
 */
export default class ShiftBriefing {
  private overlay: Overlay;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "shift-briefing");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(o: BriefingOptions): void {
    let next: () => void = o.onExplore;
    this.overlay.setHeader({ title: t("brief.title", { day: o.day }), avatar: "☀️", subtitle: t("brief.subtitle", { time: o.time }) });

    const doc = el("div", "brief-doctor");
    const photo = el("span", "brief-photo");
    const img = el("img");
    img.src = o.doctor.portrait;
    img.alt = "";
    photo.append(img);
    const who = el("div", "brief-who");
    const change = el("button", "secondary-btn brief-change", t("profile.change"));
    change.addEventListener("click", () => {
      next = o.onChangeDoctor;
      this.overlay.close();
    });
    who.append(el("span", "brief-label", t("brief.today")), el("strong", "", o.doctor.name), change);
    doc.append(photo, who);

    const facts = el("ul", "brief-facts");
    const fact = (icon: string, text: string) => {
      const li = el("li");
      li.append(el("span", "brief-fact-icon", icon), el("span", "", text));
      facts.append(li);
    };
    fact("🏥", t("brief.opens"));
    fact("🪑", t("brief.patients"));
    fact("🧺", t("brief.trays", { clean: o.trays.clean, total: o.trays.total }));
    fact("🕌", o.prayerReminders ? t("brief.prayerOn") : t("brief.prayerOff"));

    const start = el("button", "primary-btn wide brief-start", `▶  ${t("brief.start")}`);
    start.addEventListener("click", () => {
      next = o.onStart;
      this.overlay.close();
    });
    const explore = el("button", "link-btn brief-explore", t("brief.explore"));
    explore.addEventListener("click", () => this.overlay.close());

    this.overlay.body.replaceChildren(doc, facts);
    this.overlay.footer.replaceChildren(start, explore);
    this.overlay.open(() => next());
    start.focus({ preventScroll: true });
  }
}
