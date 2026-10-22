import { play as playSound } from "../../game/audio";
import IncidentPanel from "./IncidentPanel";
import { el } from "../case/Overlay";
import { createVisitor, guideVisitor, ROACH_GUIDE } from "../../events/RoachGuide";
import { t } from "../../game/i18n";
import type { EventOutcome, EventRewards } from "../../events/types";
import "./roach-guide.css";

// Eight top-facing walking frames, read across the two rows of the supplied sheet.
const VISITOR_SHEET = { url: "assets/cockroach.webp", columns: 4, frames: 8, fps: 12 } as const;
const BROOM = `<svg viewBox="0 0 100 120" aria-hidden="true"><g stroke="#5a3c32" stroke-width="3" stroke-linejoin="round"><rect x="44" y="5" width="12" height="68" rx="6" fill="#bd7650"/><path d="M28 67h44l14 40q-36 14-72 0z" fill="#edb74e"/><path d="m29 80-5 28m17-28-2 32m18-32 3 32m10-32 6 28" fill="none" stroke="#bd8130"/><rect x="26" y="66" width="48" height="14" rx="4" fill="#5b9ba0"/></g><path d="M48 13v43" stroke="#edc29d" stroke-width="3" stroke-linecap="round"/></svg>`;

export default class CockroachPanel extends IncidentPanel {
  constructor(parent: HTMLElement) { super(parent, "cockroach-panel"); }

  open(seed: number, rewards: EventRewards, done: (outcome: EventOutcome) => void, occurrence = 1): void {
    this.begin({ title: t("roach.title"), avatar: "assets/portraits/amy.webp", subtitle: t("roach.from") }, rewards, done);
    let roach = createVisitor(seed);
    const broomPoint = { x: 0.11, y: 0.73 };
    let pointer: number | null = null;
    let grab = { x: 0, y: 0 };
    const keys = new Set<string>();
    let finished = false;
    let walkTime = 0;
    let lastFrame = -1;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const story = el("div", "roach-story", t(occurrence > 1 ? "roach.bubbleRepeat" : "roach.bubble"));
    const instruction = el("p", "incident-instruction", t("roach.instructions"));
    const stage = el("div", "incident-stage roach-stage");
    stage.setAttribute("role", "group");
    stage.setAttribute("aria-label", t("roach.floor"));
    const route = el("div", "roach-route");
    route.setAttribute("aria-hidden", "true");
    route.append(el("span", "", "›"), el("span", "", "›"), el("span", "", "›"));
    const coffee = el("span", "incident-coffee", "☕");
    coffee.setAttribute("aria-hidden", "true");
    stage.append(coffee, route, el("span", "roach-exit", t("roach.exit")));
    const visitor = el("div", "roach-visitor");
    const sprite = el("span", "roach-sprite");
    sprite.style.backgroundImage = `url("${VISITOR_SHEET.url}")`;
    visitor.append(sprite);
    visitor.setAttribute("aria-hidden", "true");
    const broom = el("button", "roach-broom");
    broom.type = "button";
    broom.innerHTML = BROOM;
    broom.setAttribute("aria-label", t("roach.broom"));
    broom.setAttribute("aria-description", t("roach.keyboard"));
    const progress = el("div", "roach-journey");
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", t("roach.journey"));
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    const trail = el("div", "roach-journey-track");
    const fill = el("span", "roach-journey-fill");
    trail.append(fill);
    progress.append(el("span", "roach-journey-start", "☕"), trail, el("span", "", t("roach.exit")));
    const point = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };
    const placeBroom = () => {
      broomPoint.x = Math.max(0.06, Math.min(0.93, broomPoint.x));
      broomPoint.y = Math.max(0.08, Math.min(0.94, broomPoint.y));
      broom.style.left = `${broomPoint.x * 100}%`;
      broom.style.top = `${broomPoint.y * 100}%`;
    };
    const stop = () => { pointer = null; keys.clear(); broom.classList.remove("held"); };
    broom.addEventListener("pointerdown", e => {
      if (finished || pointer !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      broom.focus({ preventScroll: true });
      pointer = e.pointerId;
      const p = point(e);
      grab = { x: broomPoint.x - p.x, y: broomPoint.y - p.y };
      broom.setPointerCapture(e.pointerId);
    });
    broom.addEventListener("pointermove", e => {
      if (e.pointerId !== pointer || finished) return;
      const p = point(e);
      broomPoint.x = p.x + grab.x;
      broomPoint.y = p.y + grab.y;
      placeBroom();
    });
    const release = (e: PointerEvent) => { if (e.pointerId === pointer) stop(); };
    broom.addEventListener("pointerup", release);
    broom.addEventListener("pointercancel", release);
    broom.addEventListener("lostpointercapture", release);
    const controlKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " ", "Enter"];
    broom.addEventListener("keydown", e => {
      if (!controlKeys.includes(e.key)) return;
      e.preventDefault(); e.stopPropagation();
      if (!finished) keys.add(e.key);
    });
    broom.addEventListener("keyup", e => {
      if (!controlKeys.includes(e.key)) return;
      e.preventDefault(); e.stopPropagation(); keys.delete(e.key);
    });
    broom.addEventListener("blur", () => keys.clear());
    let lastPercent = -1;
    let wasWalking = false;
    const render = () => {
      visitor.style.left = `${roach.x * 100}%`;
      visitor.style.top = `${roach.y * 100}%`;
      visitor.style.setProperty("--heading", `${roach.heading}deg`);
      visitor.classList.toggle("walking", roach.walking);
      if (roach.walking && !wasWalking) playSound("scuttle");
      const frame = roach.walking && !reduced ? Math.floor(walkTime * VISITOR_SHEET.fps) % VISITOR_SHEET.frames : 0;
      if (frame !== lastFrame) {
        sprite.style.backgroundPosition = `${frame % VISITOR_SHEET.columns / (VISITOR_SHEET.columns - 1) * 100}% ${Math.floor(frame / VISITOR_SHEET.columns) * 100}%`;
        sprite.dataset.frame = String(frame);
        lastFrame = frame;
      }
      broom.classList.toggle("held", pointer !== null || keys.size > 0);
      const percent = Math.round(Math.max(0, Math.min(1, (roach.x - 0.22) / (ROACH_GUIDE.exitX - 0.22))) * 100);
      if (percent !== lastPercent) {
        fill.style.width = `${percent}%`;
        progress.setAttribute("aria-valuenow", String(percent));
        lastPercent = percent;
      }
      if (roach.walking !== wasWalking) {
        instruction.textContent = t(roach.walking ? "roach.guiding" : "roach.instructions");
        wasWalking = roach.walking;
      }
    };
    stage.append(visitor, broom);
    const play = el("div", "incident-play roach-play");
    play.append(stage, progress, el("small", "roach-keyboard-hint", t("roach.keyboard")));
    const copy = el("div", "incident-copy roach-copy");
    copy.append(story, instruction);
    this.overlay.body.replaceChildren(copy, play);
    placeBroom();
    render();
    broom.focus({ preventScroll: true });
    let previous = performance.now();
    this.every(() => {
      if (finished) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const floor = { width: stage.clientWidth, height: stage.clientHeight };
      if (keys.size) {
        const speed = Math.min(floor.width, floor.height) * 0.9 * dt;
        broomPoint.x += (Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"))) * speed / floor.width;
        broomPoint.y += (Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp"))) * speed / floor.height;
        placeBroom();
      }
      roach = guideVisitor(roach, broomPoint, pointer !== null || keys.size > 0, dt, floor);
      walkTime = roach.walking ? walkTime + dt : 0;
      render();
      if (roach.escaped) {
        finished = true;
        stop();
        progress.setAttribute("aria-valuenow", "100");
        fill.style.width = "100%";
        visitor.classList.add("roach-leaving");
        this.after(() => this.success(t(occurrence > 1 ? "roach.successRepeat" : "roach.success")), reduced ? 0 : 550);
      }
    }, 1000 / 60);
  }
}
