import IncidentPanel from "./IncidentPanel";
import { el } from "../case/Overlay";
import { COMEDY } from "../../data/gameplay";
import { t } from "../../game/i18n";
import type { EventOutcome, EventRewards } from "../../events/types";

export default class PrinterPanel extends IncidentPanel {
  constructor(parent: HTMLElement) { super(parent, "printer-panel"); }

  open(seed: number, rewards: EventRewards, done: (outcome: EventOutcome) => void, occurrence = 1): void {
    this.begin({ title: t("printer.title"), avatar: "assets/portraits/nurul.webp", subtitle: t("printer.from") }, rewards, done);
    let stopped = false;
    let collecting = false;
    let collected = 0;
    const story = el("div", "case-speech", t(occurrence > 1 ? "printer.introRepeat" : "printer.intro"));
    const instruction = el("p", "incident-instruction", t("printer.stopHint"));
    const stage = el("div", "incident-stage printer-stage printing");
    const printer = el("div", "incident-printer");
    printer.setAttribute("aria-hidden", "true");
    printer.append(el("span", "printer-input"), el("span", "printer-light"), el("span", "printer-slot"));
    const confetti = el("div", "printer-confetti");
    for (let i = 0; i < 4; i++) {
      const paper = el("i");
      paper.style.setProperty("--i", String(i));
      confetti.append(paper);
    }
    const stop = el("button", "printer-stop", t("printer.stop"));
    const tray = el("div", "printer-tray", t("printer.tray"));
    const progress = el("div", "incident-progress");
    progress.setAttribute("role", "status");
    progress.textContent = t("incident.progress", { n: 0, total: COMEDY.printerSheets });
    const sheets: HTMLButtonElement[] = [];
    for (let i = 0; i < COMEDY.printerSheets; i++) {
      const sheet = el("button", "printer-sheet", "▤");
      sheet.setAttribute("aria-label", t("printer.sheet", { n: i + 1 }));
      sheet.style.left = `${7 + i * 23}%`;
      sheet.style.top = `${50 + ((seed + i * 7) % 8)}%`;
      sheet.style.setProperty("--tilt", `${(i % 2 ? 1 : -1) * 9}deg`);
      sheet.disabled = true;
      sheet.addEventListener("click", () => {
        if (!stopped || collecting || sheet.classList.contains("collected")) return;
        collecting = true;
        instruction.textContent = t("printer.collecting");
        sheet.classList.add("collecting");
        sheets.forEach(s => s.disabled = true);
        this.after(() => {
          sheet.classList.add("collected");
          collected++;
          collecting = false;
          instruction.textContent = t("printer.tidyHint");
          progress.textContent = t("incident.progress", { n: collected, total: COMEDY.printerSheets });
          sheets.forEach(s => s.disabled = s.classList.contains("collected"));
          if (collected === COMEDY.printerSheets) this.success(t(occurrence > 1 ? "printer.successRepeat" : "printer.success"));
        }, COMEDY.paperCollectMs);
      });
      sheets.push(sheet);
    }
    stop.addEventListener("click", () => {
      if (stop.disabled) return;
      stop.disabled = true;
      stop.textContent = t("printer.stopping");
      this.after(() => {
        stopped = true;
        stage.classList.remove("printing");
        stop.classList.add("hidden");
        instruction.textContent = t("printer.tidyHint");
        sheets.forEach(s => s.disabled = false);
        sheets[0]?.focus({ preventScroll: true });
      }, COMEDY.printerStopMs);
    });
    stage.append(printer, confetti, stop, ...sheets, tray);
    const copy = el("div", "incident-copy");
    copy.append(story, instruction, el("small", "incident-hint", t("incident.hint")));
    const play = el("div", "incident-play");
    play.append(stage, progress);
    this.overlay.body.replaceChildren(copy, play);
  }
}
