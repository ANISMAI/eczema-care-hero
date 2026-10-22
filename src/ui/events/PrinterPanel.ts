import { play as playSound } from "../../game/audio";
import IncidentPanel from "./IncidentPanel";
import { el } from "../case/Overlay";
import { COMEDY } from "../../data/gameplay";
import { t } from "../../game/i18n";
import type { EventOutcome, EventRewards } from "../../events/types";
import "./printer-tidy.css";

// A single-tier wire document tray, viewed from above at the same angle as the desk.
const DOCUMENT_TRAY = `<svg viewBox="0 0 220 130" preserveAspectRatio="none" aria-hidden="true">
  <defs><pattern id="printer-tray-mesh" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 0h6v6" fill="none" stroke="#65717e" stroke-width=".7"/></pattern></defs>
  <path d="M15 113h170l25-77H44z" fill="#303943" opacity=".18" transform="translate(2 5)"/>
  <path d="M42 32h169l-29 77H12z" fill="#a5aeb8"/>
  <path d="M42 32h169l-29 77H12z" fill="url(#printer-tray-mesh)"/>
  <g fill="#727f8d" fill-opacity=".24" stroke="#343c46" stroke-width="3" stroke-linejoin="round">
    <path d="M42 10h171v25H42z"/>
    <path d="M42 10v25l-30 77V88z"/>
    <path d="M213 10v25l-29 77V88z"/>
  </g>
  <g fill="url(#printer-tray-mesh)" opacity=".7"><path d="M42 10h171v25H42z"/><path d="M42 10v25l-30 77V88z"/><path d="M213 10v25l-29 77V88z"/></g>
  <g fill="none" stroke="#303740" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 89 42 10h171l-29 79M12 89v23h61q25 13 51 0h60V89M42 35h169"/>
    <path d="M18 116v8m160-8v8"/>
  </g>
  <path d="M45 13h162M18 91 44 20" fill="none" stroke="#8a96a3" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

interface Paper {
  el: HTMLButtonElement;
  home: { x: number; y: number };
  collected: boolean;
}

export default class PrinterPanel extends IncidentPanel {
  constructor(parent: HTMLElement) { super(parent, "printer-panel"); }

  open(seed: number, rewards: EventRewards, done: (outcome: EventOutcome) => void, occurrence = 1): void {
    this.begin({ title: t("printer.title"), avatar: "assets/portraits/nurul.webp", subtitle: t("printer.from") }, rewards, done);
    playSound("printer");
    this.every(() => { if (!stopped) playSound("printer"); }, 1100);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stopped = false;
    let collecting = false;
    let collected = 0;
    let drag: { paper: Paper; pointer: number; grabX: number; grabY: number; moved: boolean } | null = null;
    const story = el("div", "printer-story", t(occurrence > 1 ? "printer.bubbleRepeat" : "printer.bubble"));
    const instruction = el("p", "incident-instruction", t("printer.stopHint"));
    const stage = el("div", "incident-stage printer-stage printing");
    stage.setAttribute("role", "group");
    stage.setAttribute("aria-label", t("printer.workspace"));
    const printer = el("div", "incident-printer");
    const input = el("span", "printer-input");
    const light = el("span", "printer-light");
    const slot = el("span", "printer-slot");
    [input, light, slot].forEach(part => part.setAttribute("aria-hidden", "true"));
    const stop = el("button", "printer-stop", t("printer.stop"));
    stop.type = "button";
    printer.append(input, light, slot, stop);

    const homes = [
      { x: 0.13, y: 0.7 }, { x: 0.34, y: 0.82 },
      { x: 0.61, y: 0.78 }, { x: 0.87, y: 0.77 },
    ];
    const confetti = el("div", "printer-confetti");
    confetti.setAttribute("aria-hidden", "true");
    homes.forEach((home, i) => {
      const paper = el("i");
      paper.style.setProperty("--i", String(i));
      paper.style.setProperty("--landing-x", `${home.x * 100}%`);
      paper.style.setProperty("--landing-y", `${home.y * 100}%`);
      confetti.append(paper);
    });
    const tray = el("div", "printer-tray");
    tray.setAttribute("role", "group");
    tray.setAttribute("aria-label", t("printer.tray"));
    const trayFrame = el("span", "printer-tray-frame");
    trayFrame.setAttribute("aria-hidden", "true");
    trayFrame.innerHTML = DOCUMENT_TRAY;
    const stack = el("div", "printer-paper-stack");
    stack.setAttribute("aria-hidden", "true");
    const target = el("span", "printer-drop-target", "↓");
    target.setAttribute("aria-hidden", "true");
    const front = el("div", "printer-tray-front");
    const progress = el("span", "printer-count", `0 / ${COMEDY.printerSheets}`);
    progress.setAttribute("role", "status");
    progress.setAttribute("aria-atomic", "true");
    front.append(el("span", "printer-tray-title", t("printer.tray")), progress);
    tray.append(trayFrame, stack, target, front);
    const sheets: Paper[] = [];
    const point = (clientX: number, clientY: number) => {
      const r = stage.getBoundingClientRect();
      return { x: (clientX - r.left - stage.clientLeft) / stage.clientWidth,
        y: (clientY - r.top - stage.clientTop) / stage.clientHeight };
    };
    const place = (paper: Paper, p: { x: number; y: number }) => {
      // Keep papers on-stage when the viewport rotates, including tilted corners.
      const marginX = Math.ceil(paper.el.offsetWidth * 0.62);
      const marginY = Math.ceil(paper.el.offsetHeight * 0.62);
      paper.el.style.left = `clamp(${marginX}px, ${p.x * 100}%, calc(100% - ${marginX}px))`;
      paper.el.style.top = `clamp(${marginY}px, ${p.y * 100}%, calc(100% - ${marginY}px))`;
    };
    const insideTray = (paper: Paper) => {
      const s = paper.el.getBoundingClientRect(), r = tray.getBoundingClientRect();
      const x = s.left + s.width / 2, y = s.top + s.height / 2;
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };
    const returnHome = (paper: Paper) => {
      paper.el.classList.remove("dragging");
      tray.classList.remove("ready");
      place(paper, paper.home);
    };
    const collect = (paper: Paper) => {
      if (!this.isOpen || !stage.isConnected || !stopped || collecting || paper.collected) return;
      collecting = true;
      paper.el.classList.remove("dragging");
      paper.el.classList.add("collecting");
      tray.classList.add("ready");
      instruction.textContent = t("printer.collecting");
      sheets.forEach(s => s.el.disabled = true);
      const r = tray.getBoundingClientRect();
      place(paper, point(r.left + r.width / 2, r.top + r.height * 0.35));
      this.after(() => {
        paper.collected = true;
        paper.el.classList.add("collected");
        collected++;
        const filed = el("i", "printer-filed-sheet");
        filed.style.setProperty("--stack-index", String(collected - 1));
        stack.append(filed);
        target.classList.add("hidden");
        tray.classList.remove("ready");
        progress.textContent = `${collected} / ${COMEDY.printerSheets}`;
        progress.setAttribute("aria-label", t("printer.progress", { n: collected, total: COMEDY.printerSheets }));
        collecting = false;
        instruction.textContent = t("printer.tidyHint");
        sheets.forEach(s => s.el.disabled = s.collected);
        if (collected === COMEDY.printerSheets) {
          this.after(() => this.success(t(occurrence > 1 ? "printer.successRepeat" : "printer.success")), reduced ? 0 : 400);
        } else {
          sheets.find(s => !s.collected)?.el.focus({ preventScroll: true });
        }
      }, reduced ? 0 : COMEDY.paperCollectMs);
    };
    for (let i = 0; i < COMEDY.printerSheets; i++) {
      const sheet = el("button", "printer-sheet");
      sheet.type = "button";
      sheet.dataset.sheet = String(i);
      sheet.setAttribute("aria-label", t("printer.sheet", { n: i + 1 }));
      sheet.setAttribute("aria-description", t("printer.keyboard"));
      const lines = el("span", "printer-paper-lines");
      lines.setAttribute("aria-hidden", "true");
      sheet.append(lines);
      sheet.style.setProperty("--tilt", `${(i % 2 ? 1 : -1) * (7 + Math.abs(seed) % 5)}deg`);
      sheet.disabled = true;
      const paper: Paper = { el: sheet, home: homes[i], collected: false };
      sheet.addEventListener("pointerdown", e => {
        if (!stopped || collecting || drag || paper.collected || (e.pointerType === "mouse" && e.button !== 0)) return;
        e.preventDefault();
        sheet.focus({ preventScroll: true });
        const r = sheet.getBoundingClientRect();
        const centre = point(r.left + r.width / 2, r.top + r.height / 2);
        const p = point(e.clientX, e.clientY);
        drag = { paper, pointer: e.pointerId, grabX: centre.x - p.x, grabY: centre.y - p.y, moved: false };
        sheet.classList.add("dragging");
        sheet.setPointerCapture(e.pointerId);
      });
      sheet.addEventListener("pointermove", e => {
        if (!drag || drag.paper !== paper || drag.pointer !== e.pointerId) return;
        const p = point(e.clientX, e.clientY);
        drag.moved = true;
        place(paper, { x: p.x + drag.grabX, y: p.y + drag.grabY });
        tray.classList.toggle("ready", insideTray(paper));
      });
      sheet.addEventListener("pointerup", e => {
        if (!drag || drag.paper !== paper || drag.pointer !== e.pointerId) return;
        const moved = drag.moved;
        drag = null;
        if (sheet.hasPointerCapture(e.pointerId)) sheet.releasePointerCapture(e.pointerId);
        if (moved && insideTray(paper)) collect(paper);
        else {
          returnHome(paper);
          if (moved) instruction.textContent = t("printer.missed");
        }
      });
      const cancel = (e: PointerEvent) => {
        if (!drag || drag.paper !== paper || drag.pointer !== e.pointerId) return;
        drag = null;
        returnHome(paper);
      };
      sheet.addEventListener("pointercancel", cancel);
      sheet.addEventListener("lostpointercapture", cancel);
      // Native keyboard and assistive-technology activation is an alternative to dragging.
      sheet.addEventListener("click", e => { if (e.detail === 0) collect(paper); });
      sheets.push(paper);
    }
    stop.addEventListener("click", () => {
      if (stop.disabled) return;
      stop.disabled = true;
      stop.textContent = "…";
      stop.setAttribute("aria-label", t("printer.stopping"));
      this.after(() => {
        stopped = true;
        stage.classList.remove("printing");
        stage.classList.add("stopped");
        stop.textContent = t("printer.off");
        stop.setAttribute("aria-label", t("printer.off"));
        instruction.textContent = t("printer.tidyHint");
        sheets.forEach(s => s.el.disabled = false);
        sheets[0]?.el.focus({ preventScroll: true });
      }, COMEDY.printerStopMs);
    });
    stage.append(printer, confetti, ...sheets.map(s => s.el), tray);
    const copy = el("div", "incident-copy printer-copy");
    copy.append(story, instruction);
    const play = el("div", "incident-play printer-play");
    play.append(stage, el("small", "printer-keyboard-hint", t("printer.keyboard")));
    this.overlay.body.replaceChildren(copy, play);
    sheets.forEach(paper => place(paper, paper.home));
    // Phaser captures Space globally, so handle panel activation before its game input.
    for (const button of [stop, ...sheets.map(s => s.el)]) {
      button.addEventListener("keydown", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) button.click();
      });
      button.addEventListener("keyup", e => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        e.stopPropagation();
      });
    }
    stop.focus({ preventScroll: true });
  }
}
