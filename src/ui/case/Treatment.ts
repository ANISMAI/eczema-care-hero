import Overlay, { el } from "./Overlay";
import { STAGE_ZONE, WATER_HTML, handSvg, toStage } from "./HandArt";
import { face, icon, type IconName, type Mood } from "../icons";
import type { CareSession, Tool, ToolId, TreatStep } from "../../mission/types";
import "./toolwheel.css";

/** What the treatment screen needs from the case runner. */
export interface TreatmentHooks {
  patient: { fullName: string; portrait: string };
  /** The activities, tools and hotspots of this care session (from the case's care plan). */
  session: CareSession;
  /** The activity currently due (null when the treatment is finished). */
  current(): TreatStep | null;
  isDone(stepId: string): boolean;
  progressOf(stepId: string): string[];
  addProgress(stepId: string, value: string): void;
  /** Care trays: clean ones left on the rack besides the one in use, and the total. */
  trays?: { left: number; total: number };
  /** A wrong tool or amount: the patient winces; lowers the reward a little. */
  wrongPick(stepId: string): void;
  complete(stepId: string): void;
  onClose(): void;
}

const LATHER_GOAL = 3.5; // stage widths of rubbing
const RINSE_MS = 1400;
const PATS = 5;
/** Pumps of moisturiser for two hands' worth on the back of one hand. */
const PUMPS = 2;
/** Where the dots of cream land (stage %), first pump then second. */
const DOTS: [number, number][][] = [
  [[46, 34], [58, 50], [42, 64]],
  [[54, 30], [38, 47], [56, 70]],
];
/** How much slow rubbing over a dot smooths it in (stage widths). */
const DOT_RUB = 0.45;
const MAX_SPEED = 2.4; // stage widths per second; faster strokes don't count

/**
 * Dentist-Hero style treatment screen: a close-up of the patient's hand, a tray of tools,
 * the patient's face and a comfort bar. Pick the right tool, use it on the hand. Wrong tools
 * (scrub, scented lotion) make the patient wince. Hardly any text. Which activities run
 * (inspect, wash, dry, cream...) comes from the case's care plan.
 */
export default class Treatment {
  private overlay: Overlay;
  private h!: TreatmentHooks;
  private stage!: HTMLDivElement;
  private tray!: HTMLDivElement;
  private face!: HTMLSpanElement;
  private comfort!: HTMLDivElement;
  private hint!: HTMLDivElement;
  private toolInfo!: HTMLDivElement;
  private toolName!: HTMLHeadingElement;
  private toolFunction!: HTMLParagraphElement;
  private previewTool: ToolId | null = null;
  private lastNeededTool: ToolId | null = null;
  private pill!: HTMLDivElement;
  private gauge!: HTMLDivElement;
  private canvas!: HTMLCanvasElement;
  private lens!: HTMLDivElement;
  private towel!: HTMLDivElement;
  private stepper!: HTMLDivElement;
  private water!: HTMLDivElement;
  private blob!: HTMLSpanElement;
  private zone!: HTMLDivElement;
  private active: ToolId | null = null;
  private timers: number[] = [];
  private winceUntil = 0;
  private penalised = new Set<string>();

  // per-step working state
  private lather = 0;
  private suds: HTMLElement[] = [];
  private pats: { x: number; y: number }[] = [];
  /** Pumps done (the dots are on the hand once this reaches PUMPS). */
  private pumps = 0;
  private dots: { el: HTMLElement; x: number; y: number; rub: number; done: boolean }[] = [];
  private pump!: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-treat");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(h: TreatmentHooks): void {
    this.h = h;
    this.active = null;
    this.previewTool = null;
    this.lastNeededTool = null;
    this.lather = 0;
    this.suds = [];
    this.pats = [];
    this.pumps = 0;
    this.dots = [];
    this.penalised.clear();
    this.overlay.setHeader({ title: "Care Room", avatar: h.patient.portrait, subtitle: h.patient.fullName });
    this.build();
    this.overlay.open(() => {
      this.clearTimers();
      h.onClose();
    });
    this.refresh();
  }

  close(): void {
    this.overlay.close();
  }

  // ---------- layout ----------

  private build(): void {
    const top = el("div", "treat-top");
    this.face = el("span", "treat-face");
    const bar = el("div", "treat-comfort");
    this.comfort = el("div", "treat-comfort-fill");
    bar.append(this.comfort, el("span", "treat-comfort-label", "Comfort"));
    top.append(this.face, bar);
    if (this.h.trays) {
      const { left, total } = this.h.trays;
      const pill = el("span", left ? "treat-trays" : "treat-trays empty");
      pill.innerHTML = `<span class="ico-wrap">${icon("basket")}</span>${left}/${total} clean`;
      pill.title = left ? `${left} more clean ${left === 1 ? "tray" : "trays"} after this one` : "No clean trays left after this one";
      pill.setAttribute("aria-label", pill.title);
      top.append(pill);
    }

    // which step of the routine we're on (only when there is more than one)
    const names: Record<string, [IconName, string]> = {
      inspect: ["lens", "Look"],
      referral: ["phone", "Ask"],
      wash: ["soap", "Wash"],
      dry: ["towel", "Dry"],
      cream: ["cream", "Moisturise"],
    };
    this.stepper = el("div", "treat-steps");
    if (this.h.session.steps.length > 1) {
      for (const s of this.h.session.steps) {
        const chip = el("span");
        const [ic, label] = names[s.id] ?? ["cream", s.id];
        chip.innerHTML = `<span class="ico-wrap">${icon(ic)}</span>${label}`;
        chip.dataset.step = s.id;
        this.stepper.append(chip);
      }
    }

    this.stage = el("div", "hand-stage treat-stage");
    this.stage.innerHTML = handSvg();
    this.zone = el("div", "apply-zone");
    const Z = STAGE_ZONE;
    Object.assign(this.zone.style, { left: `${Z.cx - Z.rx}%`, top: `${Z.cy - Z.ry}%`, width: `${Z.rx * 2}%`, height: `${Z.ry * 2}%` });
    this.canvas = el("canvas", "apply-canvas");
    this.water = el("div", "water");
    this.water.innerHTML = WATER_HTML;
    this.towel = el("div", "towel");
    this.blob = el("span", "cream-blob");
    this.lens = el("div", "lens");
    this.lens.appendChild(el("span", "lens-handle"));
    // the moisturiser pump bottle, above the hand
    this.pump = el("button", "pump");
    this.pump.type = "button";
    this.pump.setAttribute("aria-label", "Press the pump");
    this.pump.innerHTML = `<span class="pump-head"></span><span class="pump-bottle">${icon("cream")}</span><span class="pump-count"></span>`;
    this.pump.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      this.press();
    });
    this.stage.append(this.zone, this.canvas, this.water, this.blob, this.towel, this.lens, this.pump);
    for (const s of this.h.session.spots) {
      const m = el("div", "found-spot");
      m.dataset.spot = s.id;
      m.style.left = `${toStage(s.x)}%`;
      m.style.top = `${toStage(s.y)}%`;
      m.appendChild(el("span", "found-label", s.label));
      this.stage.appendChild(m);
    }
    this.bindStage();

    this.gauge = el("div", "gauge hidden");
    this.gauge.append(el("span", "gauge-zone"), el("span", "gauge-fill"), el("span", "gauge-label", "Just right"));
    this.hint = el("div", "treat-hint");
    this.pill = el("div", "session-flash");
    this.toolInfo = el("div", "treat-tool-info");
    this.toolInfo.setAttribute("role", "status");
    this.toolInfo.setAttribute("aria-atomic", "true");
    this.toolName = el("h3", "treat-tool-name");
    this.toolFunction = el("p", "treat-tool-function");
    this.toolInfo.append(this.toolName, this.toolFunction);

    this.tray = el("div", "treat-tray");
    this.tray.classList.toggle("treat-wheel", this.h.session.tools.length === 4);
    this.tray.setAttribute("role", "group");
    this.tray.setAttribute("aria-label", "Care tools");
    for (const tool of this.h.session.tools) {
      const b = el("button", "treat-tool");
      b.type = "button";
      b.dataset.tool = tool.id;
      b.setAttribute("aria-label", tool.label);
      const ic = el("span", "treat-tool-icon");
      ic.setAttribute("aria-hidden", "true");
      ic.innerHTML = icon(tool.id as IconName);
      b.append(ic, el("span", "treat-tool-label", tool.label));
      const preview = () => {
        this.previewTool = tool.id;
        this.describeTool(tool);
      };
      b.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "mouse") preview();
      });
      b.addEventListener("focus", preview);
      b.addEventListener("click", () => {
        preview();
        this.pick(tool);
      });
      this.tray.appendChild(b);
    }

    const workspace = el("div", "treat-workspace");
    const handPanel = el("div", "treat-hand-panel");
    handPanel.append(this.stage, this.gauge, this.pill);
    const toolsPanel = el("div", "treat-tools-panel");
    toolsPanel.append(...(this.stepper.childElementCount ? [this.stepper] : []), this.tray, this.hint);
    workspace.append(handPanel, this.toolInfo, toolsPanel);
    this.overlay.body.replaceChildren(top, workspace);
    this.overlay.footer.replaceChildren();
  }

  /** The tool the current step needs right now. */
  private neededTool(): ToolId | null {
    const step = this.h.current();
    if (!step || !step.tools.length) return null;
    if (step.id === "wash") return this.h.progressOf("wash").includes("lather") ? "water" : "soap";
    return step.tools[0];
  }

  private refresh(): void {
    const step = this.h.current();
    const need = this.neededTool();
    if (need !== this.lastNeededTool) {
      this.previewTool = null;
      this.lastNeededTool = need;
    }
    const described = this.h.session.tools.find((tool) => tool.id === (this.previewTool ?? this.active ?? need));
    if (described) this.describeTool(described);
    const steps = this.h.session.steps;
    const done = steps.filter((s) => this.h.isDone(s.id)).length / steps.length;
    this.stepper.querySelectorAll<HTMLElement>("span").forEach((chip) => {
      chip.classList.toggle("done", this.h.isDone(chip.dataset.step!));
      chip.classList.toggle("now", chip.dataset.step === step?.id);
    });
    this.comfort.style.width = `${done * 100}%`;
    const mood: Mood = performance.now() < this.winceUntil ? "wince" : done >= 1 ? "happy" : done >= 0.5 ? "okay" : "sore";
    if (this.face.dataset.mood !== mood) {
      this.face.dataset.mood = mood;
      this.face.innerHTML = face(mood);
    }

    this.tray.querySelectorAll<HTMLButtonElement>(".treat-tool").forEach((b) => {
      const id = b.dataset.tool as ToolId;
      b.classList.toggle("next", id === need);
      b.classList.toggle("active", id === this.active);
      b.setAttribute("aria-pressed", String(id === this.active));
      const usedUp = this.h.session.steps.some((s) => s.tools.includes(id) && this.h.isDone(s.id)) ||
        (id === "soap" && this.h.progressOf("wash").includes("lather"));
      b.classList.toggle("used", usedUp);
    });

    // found spots, cream look
    const found = this.h.progressOf("inspect");
    this.stage.querySelectorAll<HTMLElement>(".found-spot").forEach((m) =>
      m.classList.toggle("show", found.includes(m.dataset.spot!) && !this.h.isDone("inspect"))
    );
    this.stage.classList.toggle("healed", this.h.isDone("cream"));
    this.zone.classList.remove("show");
    this.pump.classList.toggle("show", this.active === "cream" && this.pumps < PUMPS && !this.h.isDone("cream"));
    (this.pump.querySelector(".pump-count") as HTMLElement).textContent = `${this.pumps} / ${PUMPS}`;
    this.lens.classList.toggle("show", this.active === "lens");
    this.towel.classList.toggle("show", this.active === "towel");
    this.gauge.classList.add("hidden");

    const hints: Partial<Record<ToolId, string>> = {
      lens: "Drag over the hand",
      soap: "Rub gently",
      water: "Hold on the hand",
      towel: "Tap to pat",
      cream:
        this.pumps < PUMPS
          ? `Press the pump ${PUMPS} times`
          : `Smooth each dot in, slowly (${this.dots.filter((d) => d.done).length} / ${this.dots.length})`,
    };
    this.hint.textContent = !step ? "" : this.active && this.active === need ? hints[this.active] ?? "" : "Pick a tool";
  }

  // ---------- tools ----------

  private describeTool(tool: Tool): void {
    const functions: Record<ToolId, string> = {
      lens: "Move over the hand to take a closer look.",
      phone: "Ask the doctor to review the care plan.",
      soap: "Rub gently on the hand to make suds.",
      water: "Hold on the hand to rinse away the suds.",
      towel: "Tap the hand to pat it dry gently.",
      cream: "Pump twice, then smooth each dot into the hand slowly.",
      scrub: "A rough scrub for the skin.",
      scented: "A lotion with added fragrance.",
      hot: "Hot water for washing.",
    };
    // Avoid repeating live-region announcements during progress updates.
    if (this.toolInfo.dataset.describedTool === tool.id) return;
    this.toolInfo.dataset.describedTool = tool.id;
    this.toolName.textContent = tool.label;
    this.toolFunction.textContent = tool.why ?? functions[tool.id];
  }

  private pick(tool: Tool): void {
    const step = this.h.current();
    if (!step) return;
    if (tool.wrong) {
      this.mistake(step.id, tool.id, tool.why ?? "Not this one");
      this.shake(tool.id);
      return;
    }
    if (tool.id !== this.neededTool()) {
      this.shake(tool.id);
      const need = this.neededTool();
      const why: Partial<Record<ToolId, string>> = {
        soap: "Wash gently first",
        water: "Rinse off the suds first",
        towel: "Pat dry before moisturising",
        cream: "Moisturise last, once the skin is dry",
      };
      // tools already used for this visit just say so (no penalty)
      const used = this.h.session.steps.some((s) => s.tools.includes(tool.id) && this.h.isDone(s.id));
      if (used) this.flash("Already done", "bad");
      else this.mistake(step.id, `order-${tool.id}`, (need && why[need]) ?? "Not yet");
      return;
    }
    this.active = tool.id;
    if (tool.id === "phone") this.callDoctor(step);
    this.refresh();
  }

  private mistake(stepId: string, key: string, why: string): void {
    if (!this.penalised.has(`${stepId}:${key}`)) {
      this.penalised.add(`${stepId}:${key}`);
      this.h.wrongPick(stepId);
    }
    this.winceUntil = performance.now() + 1300;
    this.flash(why, "bad");
    this.later(() => this.refresh(), 1350);
    this.refresh();
  }

  private stepDone(stepId: string, msg: string): void {
    this.active = null;
    this.flash(msg, "good");
    this.h.complete(stepId);
    this.refresh();
  }

  private callDoctor(step: TreatStep): void {
    const r = this.h.session.referral;
    if (!r) return this.stepDone(step.id, "Approved");
    const card = el("div", "treat-doctor");
    const img = el("img");
    img.src = r.portrait;
    img.alt = "";
    card.append(img, el("strong", "", r.doctor), el("span", "", r.approval));
    this.stage.appendChild(card);
    this.later(() => {
      card.remove();
      this.stepDone(step.id, `${r.doctor} approved`);
    }, 1800);
  }

  // ---------- hand interactions ----------

  private bindStage(): void {
    let down: { x: number; y: number; t: number } | null = null;
    let last: { x: number; y: number; t: number } | null = null;
    let rubbed = false;
    let holdTimer = 0;
    let holdStart = 0;
    let warned = 0;

    const pt = (e: PointerEvent) => {
      const r = this.stage.getBoundingClientRect();
      const w = this.stage.offsetWidth;
      const hgt = this.stage.offsetHeight;
      return { x: ((e.clientX - r.left) * w) / r.width, y: ((e.clientY - r.top) * hgt) / r.height, w, h: hgt };
    };
    const stopHold = () => {
      window.clearInterval(holdTimer);
      holdTimer = 0;
      this.water.classList.remove("on");
    };

    this.stage.addEventListener("pointerdown", (e) => {
      const step = this.h.current();
      if (!step || this.active !== this.neededTool() || !this.active) return;
      this.stage.setPointerCapture(e.pointerId);
      const p = pt(e);
      down = { x: p.x / p.w, y: p.y / p.h, t: e.timeStamp };
      last = { x: p.x, y: p.y, t: e.timeStamp };
      rubbed = false;

      if (this.active === "lens") this.moveLens(p.x / p.w, p.y / p.h);
      if (this.active === "towel") this.moveTowel(p.x / p.w, p.y / p.h, true);
      if (this.active === "water") {
        holdStart = performance.now();
        if (this.active === "water") this.water.classList.add("on");
        holdTimer = window.setInterval(() => {
          const t = performance.now() - holdStart;
          if (this.active === "water") {
            const v = t / RINSE_MS;
            this.suds.forEach((s) => (s.style.opacity = String(Math.max(0, 1 - v))));
            if (v >= 1) {
              stopHold();
              this.suds.forEach((s) => s.remove());
              this.suds = [];
              this.stepDone("wash", "Rinsed");
            }
          }
        }, 30);
      }
    });

    this.stage.addEventListener("pointermove", (e) => {
      if (!down || !last) return;
      const p = pt(e);
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      const dt = Math.max(1, e.timeStamp - last.t);
      const prev = last;
      last = { x: p.x, y: p.y, t: e.timeStamp };
      if (this.active === "lens") this.moveLens(p.x / p.w, p.y / p.h);
      else if (this.active === "soap") this.rub(p, dist);
      else if (this.active === "towel") {
        this.moveTowel(p.x / p.w, p.y / p.h, true);
        if (Math.hypot(p.x / p.w - down.x, p.y / p.h - down.y) > 0.06) {
          rubbed = true;
          if (e.timeStamp - warned > 1500) {
            warned = e.timeStamp;
            this.flash("Pat, don't rub", "bad");
          }
        }
      } else if (this.active === "cream" && this.pumps >= PUMPS) {
        if (dist / p.w / (dt / 1000) > MAX_SPEED) {
          this.stage.classList.add("too-fast");
          if (e.timeStamp - warned > 1200) {
            warned = e.timeStamp;
            this.winceUntil = performance.now() + 900;
            this.flash("Too fast! Slow & gentle", "bad");
            this.refresh();
          }
        } else {
          this.stage.classList.remove("too-fast");
          const n = Math.max(1, Math.ceil(dist / (p.w * 0.03)));
          for (let s = 1; s <= n; s++) this.paint(prev.x + ((p.x - prev.x) * s) / n, prev.y + ((p.y - prev.y) * s) / n, p.w, p.h);
          if (this.smooth(p, dist)) {
            down = null;
            this.stepDone("cream", "Smooth & gentle");
          }
        }
      }
    });

    const up = (e: PointerEvent) => {
      this.stage.classList.remove("too-fast");
      if (holdTimer) stopHold();
      if (this.active === "towel" && down && !rubbed && e.type === "pointerup") this.pat(down);
      this.towel.classList.remove("press");
      down = null;
      last = null;
    };
    this.stage.addEventListener("pointerup", up);
    this.stage.addEventListener("pointercancel", up);
  }

  private moveLens(x: number, y: number): void {
    const lx = Math.max(0.04, Math.min(0.96, x)) * 100;
    const ly = Math.max(0.04, Math.min(0.96, y)) * 100;
    this.lens.style.left = `${lx}%`;
    this.lens.style.top = `${ly}%`;
    const found = this.h.progressOf("inspect");
    for (const s of this.h.session.spots) {
      if (found.includes(s.id)) continue;
      if (Math.hypot(toStage(s.x) - lx, toStage(s.y) - ly) < 11) {
        this.h.addProgress("inspect", s.id);
        this.flash(s.label, "good");
        this.refresh();
        if (this.h.progressOf("inspect").length === this.h.session.spots.length) {
          this.later(() => this.stepDone("inspect", "All found"), 700);
        }
      }
    }
  }

  private rub(p: { x: number; y: number; w: number; h: number }, dist: number): void {
    this.lather += dist / p.w;
    if (this.suds.length < 46 && Math.random() < 0.5) {
      const b = el("span", "suds");
      b.style.left = `${(p.x / p.w) * 100 + (Math.random() - 0.5) * 8}%`;
      b.style.top = `${(p.y / p.h) * 100 + (Math.random() - 0.5) * 8}%`;
      b.style.setProperty("--s", `${8 + Math.random() * 12}px`);
      this.stage.appendChild(b);
      this.suds.push(b);
    }
    if (this.lather >= LATHER_GOAL && !this.h.progressOf("wash").includes("lather")) {
      this.h.addProgress("wash", "lather");
      this.active = null;
      this.flash("Nice suds", "good");
      this.refresh();
    }
  }

  private moveTowel(x: number, y: number, press: boolean): void {
    this.towel.style.left = `${x * 100}%`;
    this.towel.style.top = `${y * 100}%`;
    this.towel.classList.toggle("press", press);
  }

  private pat(at: { x: number; y: number }): void {
    if (!this.pats.every((q) => Math.hypot(q.x - at.x, q.y - at.y) > 0.1)) return;
    this.pats.push({ x: at.x, y: at.y });
    const mark = el("span", "pat-mark");
    mark.style.left = `${at.x * 100}%`;
    mark.style.top = `${at.y * 100}%`;
    this.stage.appendChild(mark);
    this.later(() => mark.remove(), 900);
    this.flash(`Pat ${this.pats.length} / ${PATS}`, "good");
    if (this.pats.length >= PATS) this.later(() => this.stepDone("dry", "Dry & gentle"), 400);
  }

  /** One press of the pump: a few dots of cream drop onto the hand. */
  private press(): void {
    if (this.active !== "cream" || this.pumps >= PUMPS) return;
    this.pump.classList.remove("pressed");
    void this.pump.offsetWidth;
    this.pump.classList.add("pressed");
    for (const [x, y] of DOTS[this.pumps] ?? []) {
      const d = el("span", "cream-dot");
      d.style.left = `${x}%`;
      d.style.top = `${y}%`;
      d.style.setProperty("--fall", `${y - 4}%`);
      this.stage.append(d);
      this.dots.push({ el: d, x: x / 100, y: y / 100, rub: 0, done: false });
    }
    this.pumps++;
    if (this.pumps >= PUMPS) this.flash("Now smooth each dot in", "good");
    this.refresh();
  }

  /** Slow strokes over a dot smooth it into the skin. True when every dot is smoothed in. */
  private smooth(p: { x: number; y: number; w: number; h: number }, dist: number): boolean {
    const x = p.x / p.w;
    const y = p.y / p.h;
    let changed = false;
    for (const d of this.dots) {
      if (d.done || Math.hypot(d.x - x, d.y - y) > 0.11) continue;
      d.rub += dist / p.w;
      const left = Math.max(0, 1 - d.rub / DOT_RUB);
      d.el.style.setProperty("--left", left.toFixed(2));
      if (left <= 0) {
        d.done = true;
        d.el.classList.add("done");
        changed = true;
      }
    }
    if (changed) this.refresh();
    return this.dots.length > 0 && this.dots.every((d) => d.done);
  }

  private paint(x: number, y: number, w: number, h: number): void {
    const Z = STAGE_ZONE;
    const zx = (Z.cx / 100) * w;
    const zy = (Z.cy / 100) * h;
    const rx = (Z.rx / 100) * w;
    const ry = (Z.ry / 100) * h;
    const brush = w * 0.08;
    const ctx = this.canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(zx, zy, rx, ry, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x, y, brush, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- helpers ----------

  private shake(id: ToolId): void {
    const b = this.tray.querySelector<HTMLElement>(`[data-tool="${id}"]`);
    if (!b) return;
    b.classList.remove("shake");
    void b.offsetWidth;
    b.classList.add("shake");
  }

  private flash(text: string, tone: "good" | "bad"): void {
    const p = el("span", `session-pill ${tone}`, `${tone === "good" ? "✓" : "!"}  ${text}`);
    this.pill.replaceChildren(p);
    this.later(() => p.classList.add("fade"), 1600);
  }

  private later(fn: () => void, ms: number): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  private clearTimers(): void {
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers = [];
  }
}
