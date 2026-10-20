import Overlay, { el } from "./Overlay";
import { STAGE_ZONE, handSvg, toStage } from "./HandArt";
import type { CareSession, Tool, ToolId, TreatStep } from "../../mission/types";

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
  /** A wrong tool or amount: the patient winces; lowers the reward a little. */
  wrongPick(stepId: string): void;
  complete(stepId: string): void;
  onClose(): void;
}

const LATHER_GOAL = 3.5; // stage widths of rubbing
const RINSE_MS = 1400;
const PATS = 5;
const SQUEEZE_LOW = 0.35;
const SQUEEZE_HIGH = 0.65;
const SQUEEZE_MS = 2600;
const SPREAD_GOAL = 0.75;
const MAX_SPEED = 2.4; // stage widths per second; faster strokes don't count
const GRID = 16;

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
  private pill!: HTMLDivElement;
  private gauge!: HTMLDivElement;
  private canvas!: HTMLCanvasElement;
  private lens!: HTMLDivElement;
  private towel!: HTMLDivElement;
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
  private squeezed = false;
  private cells = new Set<number>();
  private zoneCells = 0;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-treat");
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++) {
        const nx = (i + 0.5) / GRID - 0.5;
        const ny = (j + 0.5) / GRID - 0.5;
        if (nx * nx + ny * ny <= 0.25) this.zoneCells++;
      }
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(h: TreatmentHooks): void {
    this.h = h;
    this.active = null;
    this.lather = 0;
    this.suds = [];
    this.pats = [];
    this.squeezed = false;
    this.cells.clear();
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

    this.stage = el("div", "hand-stage treat-stage");
    this.stage.innerHTML = handSvg();
    this.zone = el("div", "apply-zone");
    const Z = STAGE_ZONE;
    Object.assign(this.zone.style, { left: `${Z.cx - Z.rx}%`, top: `${Z.cy - Z.ry}%`, width: `${Z.rx * 2}%`, height: `${Z.ry * 2}%` });
    this.canvas = el("canvas", "apply-canvas");
    this.water = el("div", "water");
    this.towel = el("div", "towel");
    this.blob = el("span", "cream-blob");
    this.lens = el("div", "lens");
    this.lens.appendChild(el("span", "lens-handle"));
    this.stage.append(this.zone, this.canvas, this.water, this.blob, this.towel, this.lens);
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

    this.tray = el("div", "treat-tray");
    for (const tool of this.h.session.tools) {
      const b = el("button", "treat-tool");
      b.dataset.tool = tool.id;
      b.setAttribute("aria-label", tool.label);
      b.append(el("span", "treat-tool-icon", tool.icon), el("span", "treat-tool-label", tool.label));
      b.addEventListener("click", () => this.pick(tool));
      this.tray.appendChild(b);
    }

    this.overlay.body.replaceChildren(top, this.stage, this.gauge, this.hint, this.pill);
    this.overlay.footer.replaceChildren(this.tray);
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
    const steps = this.h.session.steps;
    const done = steps.filter((s) => this.h.isDone(s.id)).length / steps.length;
    this.comfort.style.width = `${done * 100}%`;
    this.face.textContent = performance.now() < this.winceUntil ? "😖" : done >= 1 ? "😊" : done >= 0.5 ? "🙂" : "😣";

    this.tray.querySelectorAll<HTMLButtonElement>(".treat-tool").forEach((b) => {
      const id = b.dataset.tool as ToolId;
      b.classList.toggle("next", id === need);
      b.classList.toggle("active", id === this.active);
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
    this.zone.classList.toggle("show", this.active === "cream" && this.squeezed && !this.h.isDone("cream"));
    this.lens.classList.toggle("show", this.active === "lens");
    this.towel.classList.toggle("show", this.active === "towel");
    this.gauge.classList.toggle("hidden", !(this.active === "cream" && !this.squeezed && step?.id === "cream"));

    const hints: Partial<Record<ToolId, string>> = {
      lens: "Drag over the hand",
      soap: "Rub gently",
      water: "Hold on the hand",
      towel: "Tap to pat",
      cream: this.squeezed ? "Slow strokes in the circle" : "Hold, let go in the green",
    };
    this.hint.textContent = !step ? "" : this.active && this.active === need ? hints[this.active] ?? "" : "Pick a tool 👇";
  }

  // ---------- tools ----------

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
      this.flash("Not yet", "bad");
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
      if (this.active === "water" || (this.active === "cream" && !this.squeezed)) {
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
          } else {
            const a = t / SQUEEZE_MS;
            this.setSqueeze(a);
            if (a >= 1) {
              stopHold();
              this.releaseSqueeze(a);
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
      } else if (this.active === "cream" && this.squeezed) {
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
          if (this.cells.size / this.zoneCells >= SPREAD_GOAL) {
            down = null;
            this.stepDone("cream", "Smooth & gentle");
          }
        }
      }
    });

    const up = (e: PointerEvent) => {
      this.stage.classList.remove("too-fast");
      if (holdTimer) {
        const t = performance.now() - holdStart;
        stopHold();
        if (this.active === "cream" && !this.squeezed) this.releaseSqueeze(t / SQUEEZE_MS);
      }
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

  private setSqueeze(a: number): void {
    (this.gauge.querySelector(".gauge-fill") as HTMLElement).style.width = `${Math.min(100, a * 100)}%`;
    this.blob.style.setProperty("--a", String(Math.min(1, a)));
    this.blob.classList.add("show");
  }

  private releaseSqueeze(a: number): void {
    if (a >= SQUEEZE_LOW && a <= SQUEEZE_HIGH) {
      this.squeezed = true;
      this.flash("Just right", "good");
      this.refresh();
      return;
    }
    this.mistake("cream", `squeeze-${a < SQUEEZE_LOW ? "low" : "high"}`, a < SQUEEZE_LOW ? "Too little" : "Too much");
    this.later(() => {
      this.setSqueeze(0);
      this.blob.classList.remove("show");
    }, 700);
  }

  private paint(x: number, y: number, w: number, h: number): void {
    const Z = STAGE_ZONE;
    const zx = (Z.cx / 100) * w;
    const zy = (Z.cy / 100) * h;
    const rx = (Z.rx / 100) * w;
    const ry = (Z.ry / 100) * h;
    const brush = w * 0.08;
    for (let i = 0; i < GRID; i++)
      for (let j = 0; j < GRID; j++) {
        const cx = zx - rx + ((i + 0.5) / GRID) * rx * 2;
        const cy = zy - ry + ((j + 0.5) / GRID) * ry * 2;
        if (((cx - zx) / rx) ** 2 + ((cy - zy) / ry) ** 2 > 1) continue;
        if (Math.hypot(cx - x, cy - y) <= brush) this.cells.add(i * GRID + j);
      }
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
    this.blob.classList.toggle("show", this.cells.size < 6);
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
