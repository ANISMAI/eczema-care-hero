import { el } from "./Overlay";
import { STAGE_ZONE, handSvg, toStage } from "./HandArt";
import type { Activity, ActivityContext } from "./Session";
import type { IconChoice, StepKind } from "../../mission/types";

// The hands-on activities of the care session. Each one is short, mostly touch, with only
// an icon or a few words of text. Mouse and touch both work (pointer events).

/** Timers that are cancelled when the activity is left. */
function timers() {
  const ids: number[] = [];
  return {
    later(fn: () => void, ms: number) {
      ids.push(window.setTimeout(fn, ms));
    },
    clear() {
      ids.forEach((id) => window.clearTimeout(id));
    },
  };
}

/** Square stage with the hand illustration. */
function handStage(ctx: ActivityContext, signs = true): HTMLDivElement {
  const stage = el("div", "hand-stage");
  stage.innerHTML = handSvg({ signs });
  ctx.stage.appendChild(stage);
  return stage;
}

/** Pointer position inside an element, in its layout pixels (ignores CSS transforms). */
function localPoint(target: HTMLElement, e: PointerEvent) {
  const r = target.getBoundingClientRect();
  const w = target.offsetWidth;
  const h = target.offsetHeight;
  return { x: ((e.clientX - r.left) * w) / r.width, y: ((e.clientY - r.top) * h) / r.height, w, h };
}

function bubble(who: string, text: string, icon?: string): HTMLDivElement {
  const b = el("div", `session-bubble ${who}`);
  if (icon) b.appendChild(el("span", "session-bubble-icon", icon));
  b.appendChild(el("span", "", text));
  return b;
}

/** Row of big icon cards; resolves the picked card through onPick. Wrong cards stay greyed. */
function iconCards(choices: IconChoice[], onPick: (c: IconChoice, card: HTMLButtonElement) => void, wide = false) {
  const row = el("div", `icon-cards ${wide ? "wide" : ""}`);
  for (const c of choices) {
    const card = el("button", "icon-card");
    card.setAttribute("aria-label", c.label);
    card.append(el("span", "icon-card-icon", c.icon), el("span", "icon-card-label", c.label));
    card.addEventListener("click", () => onPick(c, card));
    row.appendChild(card);
  }
  return row;
}

// ---------------------------------------------------------------------------------------------

const history: Activity = (ctx) => {
  const t = timers();
  const rounds = ctx.def.history;
  const doneRounds = () => ctx.progress.filter((p) => p.startsWith("r")).length;
  const chat = el("div", "session-chat");
  chat.appendChild(bubble("patient", ctx.def.complaint.text, ctx.def.complaint.icons));
  const cardsBox = el("div");
  ctx.stage.append(chat, cardsBox);

  // answers already given (resume)
  rounds.slice(0, doneRounds()).forEach((r) => chat.appendChild(bubble("patient", r.answer.text, r.answer.icon)));

  const ask = () => {
    const i = doneRounds();
    if (i >= rounds.length) {
      ctx.done();
      return;
    }
    ctx.hint(`Ask a question (${i + 1}/${rounds.length})`);
    const tried = new Set<string>();
    cardsBox.replaceChildren(
      iconCards(rounds[i].choices, (c, card) => {
        if (card.disabled) return;
        if (!c.correct) {
          if (!tried.has(c.label)) {
            tried.add(c.label);
            ctx.penalize();
          }
          card.classList.add("wrong");
          card.disabled = true;
          ctx.flash(c.why, "bad");
          return;
        }
        card.classList.add("right");
        cardsBox.querySelectorAll("button").forEach((b) => (b.disabled = true));
        ctx.flash(c.why, "good");
        chat.appendChild(bubble("doctor", c.label, c.icon));
        t.later(() => {
          chat.appendChild(bubble("patient", rounds[i].answer.text, rounds[i].answer.icon));
          ctx.addProgress(`r${i}`);
          t.later(ask, 700);
        }, 450);
      })
    );
  };
  ask();
  return t.clear;
};

// ---------------------------------------------------------------------------------------------

const inspect: Activity = (ctx) => {
  const t = timers();
  ctx.hint("Drag the 🔍 over the hand");
  const stage = handStage(ctx);
  stage.classList.add("inspect-stage");
  const found = new Set(ctx.progress);
  const total = ctx.def.spots.length;
  const counter = el("div", "session-counter");
  ctx.stage.appendChild(counter);

  const markers = new Map<string, HTMLElement>();
  for (const s of ctx.def.spots) {
    const m = el("div", "found-spot");
    m.style.left = `${toStage(s.x)}%`;
    m.style.top = `${toStage(s.y)}%`;
    m.appendChild(el("span", "found-label", s.label));
    m.classList.toggle("show", found.has(s.id));
    stage.appendChild(m);
    markers.set(s.id, m);
  }
  const lens = el("div", "lens");
  lens.setAttribute("aria-label", "Magnifier");
  lens.appendChild(el("span", "lens-handle"));
  stage.appendChild(lens);
  let lensPos = { x: 82, y: 84 };

  const update = () => {
    counter.textContent = `🔍  ${found.size} / ${total} found`;
    lens.style.left = `${lensPos.x}%`;
    lens.style.top = `${lensPos.y}%`;
  };

  const check = () => {
    for (const s of ctx.def.spots) {
      if (found.has(s.id)) continue;
      const d = Math.hypot(toStage(s.x) - lensPos.x, toStage(s.y) - lensPos.y);
      if (d < 11) {
        found.add(s.id);
        ctx.addProgress(s.id);
        markers.get(s.id)!.classList.add("show");
        ctx.flash(`Found: ${s.label}`, "good");
        if (found.size === total) t.later(() => ctx.done(), 900);
      }
    }
    update();
  };

  let dragging = false;
  const move = (e: PointerEvent) => {
    const p = localPoint(stage, e);
    lensPos = { x: Math.max(4, Math.min(96, (p.x / p.w) * 100)), y: Math.max(4, Math.min(96, (p.y / p.h) * 100)) };
    check();
  };
  stage.addEventListener("pointerdown", (e) => {
    dragging = true;
    stage.setPointerCapture(e.pointerId);
    move(e);
  });
  stage.addEventListener("pointermove", (e) => dragging && move(e));
  stage.addEventListener("pointerup", () => (dragging = false));
  stage.addEventListener("pointercancel", () => (dragging = false));
  update();
  if (found.size === total) t.later(() => ctx.done(), 300);
  return t.clear;
};

// ---------------------------------------------------------------------------------------------

const referral: Activity = (ctx) => {
  ctx.hint("Ask the specialist to review");
  const card = el("div", "doctor-card");
  const img = el("img");
  img.src = ctx.def.referral.portrait;
  img.alt = "";
  card.append(img, el("strong", "", ctx.def.referral.doctor), el("span", "", "Skin Specialist"));
  ctx.stage.appendChild(card);
  const btn = el("button", "primary-btn wide", `📞  Ask ${ctx.def.referral.doctor}`);
  btn.addEventListener("click", () => ctx.callDoctor());
  ctx.footer.appendChild(btn);
};

// ---------------------------------------------------------------------------------------------

const wash: Activity = (ctx) => {
  const t = timers();
  const stage = handStage(ctx);
  stage.classList.add("wash-stage");
  const water = el("div", "water");
  const towel = el("div", "towel");
  const meter = el("div", "session-meter");
  stage.append(water, towel);
  ctx.stage.appendChild(meter);
  let phase: "lather" | "rinse" | "pat" = ctx.progress.includes("rinse") ? "pat" : ctx.progress.includes("lather") ? "rinse" : "lather";
  let lather = 0;
  const LATHER_GOAL = 3.5; // stage widths of rubbing
  const pats: { x: number; y: number }[] = [];
  const PATS = 5;
  const bubbles: HTMLElement[] = [];

  const setMeter = (v: number, label: string) => {
    meter.style.setProperty("--p", `${Math.min(100, v * 100)}%`);
    meter.textContent = label;
  };

  const enter = () => {
    ctx.footer.replaceChildren();
    if (phase === "lather") {
      ctx.hint("Rub gently to make suds 🫧");
      setMeter(0, "Suds");
    } else if (phase === "rinse") {
      ctx.hint("Hold to rinse with lukewarm water");
      setMeter(0, "Rinse");
      const hold = el("button", "primary-btn wide hold-btn", "💧  Hold to rinse");
      let timer = 0;
      let start = 0;
      const stop = () => {
        window.clearInterval(timer);
        water.classList.remove("on");
      };
      hold.addEventListener("pointerdown", (e) => {
        hold.setPointerCapture(e.pointerId);
        start = performance.now();
        water.classList.add("on");
        timer = window.setInterval(() => {
          const v = (performance.now() - start) / 1400;
          setMeter(v, "Rinse");
          bubbles.forEach((b) => (b.style.opacity = String(Math.max(0, 1 - v))));
          if (v >= 1) {
            stop();
            bubbles.forEach((b) => b.remove());
            ctx.addProgress("rinse");
            phase = "pat";
            ctx.flash("Rinsed", "good");
            enter();
          }
        }, 40);
      });
      hold.addEventListener("pointerup", stop);
      hold.addEventListener("pointercancel", stop);
      ctx.footer.appendChild(hold);
    } else {
      ctx.hint("Pat dry with the towel. Don't rub!");
      setMeter(0, `Pats 0 / ${PATS}`);
      towel.classList.add("show");
    }
  };

  let down: { x: number; y: number; t: number; rubbed: boolean } | null = null;
  let last: { x: number; y: number } | null = null;
  let warned = 0;
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    const p = localPoint(stage, e);
    down = { x: p.x / p.w, y: p.y / p.h, t: e.timeStamp, rubbed: false };
    last = { x: p.x, y: p.y };
    if (phase === "pat") {
      towel.style.left = `${(p.x / p.w) * 100}%`;
      towel.style.top = `${(p.y / p.h) * 100}%`;
      towel.classList.add("press");
    }
  });
  stage.addEventListener("pointermove", (e) => {
    if (!down || !last) return;
    const p = localPoint(stage, e);
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    last = { x: p.x, y: p.y };
    if (phase === "lather") {
      lather += dist / p.w;
      if (bubbles.length < 46 && Math.random() < 0.5) {
        const b = el("span", "suds");
        b.style.left = `${(p.x / p.w) * 100 + (Math.random() - 0.5) * 8}%`;
        b.style.top = `${(p.y / p.h) * 100 + (Math.random() - 0.5) * 8}%`;
        b.style.setProperty("--s", `${8 + Math.random() * 12}px`);
        stage.appendChild(b);
        bubbles.push(b);
      }
      setMeter(lather / LATHER_GOAL, "Suds");
      if (lather >= LATHER_GOAL) {
        down = null;
        ctx.addProgress("lather");
        phase = "rinse";
        ctx.flash("Nice suds", "good");
        enter();
      }
    } else if (phase === "pat") {
      towel.style.left = `${(p.x / p.w) * 100}%`;
      towel.style.top = `${(p.y / p.h) * 100}%`;
      if (Math.hypot(p.x / p.w - down.x, p.y / p.h - down.y) > 0.06) {
        down.rubbed = true;
        if (e.timeStamp - warned > 1500) {
          warned = e.timeStamp;
          ctx.flash("Pat, don't rub", "bad");
        }
      }
    }
  });
  const up = (e: PointerEvent) => {
    towel.classList.remove("press");
    if (phase === "pat" && down && !down.rubbed && e.type === "pointerup") {
      const spot = { x: down.x, y: down.y };
      const fresh = pats.every((q) => Math.hypot(q.x - spot.x, q.y - spot.y) > 0.1);
      if (fresh) {
        pats.push(spot);
        const mark = el("span", "pat-mark");
        mark.style.left = `${spot.x * 100}%`;
        mark.style.top = `${spot.y * 100}%`;
        stage.appendChild(mark);
        setMeter(pats.length / PATS, `Pats ${pats.length} / ${PATS}`);
        if (pats.length >= PATS) {
          towel.classList.remove("show");
          ctx.flash("Dry & gentle", "good");
          t.later(() => ctx.done(), 700);
        }
      }
    }
    down = null;
    last = null;
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  enter();
  return t.clear;
};

// ---------------------------------------------------------------------------------------------

const pick: Activity = (ctx) => {
  const t = timers();
  ctx.hint("Drag the right cream to the hand");
  const target = el("div", "pick-target");
  target.innerHTML = handSvg({ signs: false });
  const tried = new Set<string>();
  const choose = (c: IconChoice, card: HTMLButtonElement) => {
    if (card.disabled) return;
    if (!c.correct) {
      if (!tried.has(c.label)) {
        tried.add(c.label);
        ctx.penalize();
      }
      card.classList.add("wrong");
      card.disabled = true;
      ctx.flash(c.why, "bad");
      return;
    }
    card.classList.add("right");
    target.classList.add("got");
    ctx.flash(c.why, "good");
    t.later(() => ctx.done(), 800);
  };
  const cards = el("div", "icon-cards");
  for (const c of ctx.def.creams) {
    const card = el("button", "icon-card");
    card.setAttribute("aria-label", c.label);
    card.append(el("span", "icon-card-icon", c.icon), el("span", "icon-card-label", c.label));
    draggable(card, target, () => choose(c, card));
    cards.appendChild(card);
  }
  ctx.stage.append(target, cards);
  return t.clear;
};

/** Press-and-drag onto the target, or a simple tap, triggers `drop`. */
function draggable(card: HTMLElement, target: HTMLElement, drop: () => void): void {
  card.style.touchAction = "none";
  // keyboard (Enter / Space) fires a click with detail 0
  card.addEventListener("click", (e) => {
    if (e.detail === 0) drop();
  });
  card.addEventListener("pointerdown", (down) => {
    if ((card as HTMLButtonElement).disabled) return;
    const start = { x: down.clientX, y: down.clientY };
    let ghost: HTMLElement | null = null;
    card.setPointerCapture(down.pointerId);
    const over = (e: PointerEvent) => {
      const r = target.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const move = (e: PointerEvent) => {
      if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) {
        ghost = card.cloneNode(true) as HTMLElement;
        ghost.classList.add("drag-ghost");
        ghost.style.width = `${card.getBoundingClientRect().width}px`;
        document.body.appendChild(ghost);
      }
      if (ghost) {
        ghost.style.left = `${e.clientX}px`;
        ghost.style.top = `${e.clientY}px`;
        target.classList.toggle("over", over(e));
      }
    };
    const up = (e: PointerEvent) => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", up);
      card.removeEventListener("pointercancel", up);
      const wasDrag = ghost !== null;
      ghost?.remove();
      target.classList.remove("over");
      if (e.type !== "pointercancel" && (!wasDrag || over(e))) drop();
    };
    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", up);
    card.addEventListener("pointercancel", up);
  });
}

// ---------------------------------------------------------------------------------------------

const squeeze: Activity = (ctx) => {
  const t = timers();
  ctx.hint("Hold, then let go in the green zone");
  const stage = handStage(ctx, false);
  stage.classList.add("squeeze-stage");
  const blob = el("span", "cream-blob");
  stage.appendChild(blob);
  const gauge = el("div", "gauge");
  const fill = el("span", "gauge-fill");
  gauge.append(el("span", "gauge-zone"), fill, el("span", "gauge-label", "Just right"));
  ctx.stage.appendChild(gauge);
  const LOW = 0.35;
  const HIGH = 0.65;
  let amount = 0;
  let timer = 0;
  let holding = false;
  let finished = false;
  const show = () => {
    fill.style.width = `${Math.min(100, amount * 100)}%`;
    blob.style.setProperty("--a", String(amount));
  };
  const release = () => {
    if (!holding || finished) return;
    holding = false;
    window.clearInterval(timer);
    tube.classList.remove("press");
    if (amount >= LOW && amount <= HIGH) {
      finished = true;
      ctx.flash("Just the right amount", "good");
      t.later(() => ctx.done(), 800);
      return;
    }
    ctx.penalize();
    ctx.flash(amount < LOW ? "Too little. Try again" : "Too much. Try again", "bad");
    t.later(() => {
      amount = 0;
      show();
    }, 700);
  };
  const tube = el("button", "primary-btn wide hold-btn tube-btn", "🧴  Hold to squeeze");
  tube.addEventListener("pointerdown", (e) => {
    if (finished) return;
    tube.setPointerCapture(e.pointerId);
    holding = true;
    amount = 0;
    tube.classList.add("press");
    const start = performance.now();
    timer = window.setInterval(() => {
      amount = (performance.now() - start) / 2600;
      show();
      if (amount >= 1) release();
    }, 30);
  });
  tube.addEventListener("pointerup", release);
  tube.addEventListener("pointercancel", release);
  ctx.footer.appendChild(tube);
  show();
  return () => {
    window.clearInterval(timer);
    t.clear();
  };
};

// ---------------------------------------------------------------------------------------------

const spread: Activity = (ctx) => {
  const t = timers();
  ctx.hint("Slow strokes over the circle");
  const stage = handStage(ctx);
  stage.classList.add("spread-stage");
  const zoneEl = el("div", "apply-zone");
  const Z = STAGE_ZONE;
  zoneEl.style.left = `${Z.cx - Z.rx}%`;
  zoneEl.style.top = `${Z.cy - Z.ry}%`;
  zoneEl.style.width = `${Z.rx * 2}%`;
  zoneEl.style.height = `${Z.ry * 2}%`;
  const canvas = el("canvas", "apply-canvas");
  const blob = el("span", "cream-blob placed");
  stage.append(zoneEl, canvas, blob);
  const meter = el("div", "session-meter");
  ctx.stage.appendChild(meter);

  const GRID = 16;
  const GOAL = 0.75;
  const MAX_SPEED = 2.4; // stage widths per second
  const cells = new Set<number>();
  let zoneCells = 0;
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const nx = (i + 0.5) / GRID - 0.5;
      const ny = (j + 0.5) / GRID - 0.5;
      if (nx * nx + ny * ny <= 0.25) zoneCells++;
    }
  const c2d = canvas.getContext("2d")!;
  let sized = false;
  const size = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(stage.offsetWidth * dpr);
    canvas.height = Math.round(stage.offsetHeight * dpr);
    c2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    sized = true;
  };
  let finished = false;
  const update = () => {
    const pct = Math.min(100, Math.round((cells.size / zoneCells / GOAL) * 100));
    meter.style.setProperty("--p", `${pct}%`);
    meter.textContent = `Coverage ${pct}%`;
    blob.classList.toggle("gone", cells.size > 6);
    if (pct >= 100 && !finished) {
      finished = true;
      ctx.flash("Smooth & gentle", "good");
      t.later(() => ctx.done(), 800);
    }
  };
  const paint = (x: number, y: number, w: number, h: number) => {
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
        if (Math.hypot(cx - x, cy - y) <= brush) cells.add(i * GRID + j);
      }
    c2d.save();
    c2d.beginPath();
    c2d.ellipse(zx, zy, rx, ry, 0, 0, Math.PI * 2);
    c2d.clip();
    c2d.fillStyle = "#ffffff";
    c2d.beginPath();
    c2d.arc(x, y, brush, 0, Math.PI * 2);
    c2d.fill();
    c2d.restore();
  };
  let last: { x: number; y: number; t: number } | null = null;
  let warned = 0;
  stage.addEventListener("pointerdown", (e) => {
    if (!sized) size();
    stage.setPointerCapture(e.pointerId);
    const p = localPoint(stage, e);
    last = { x: p.x, y: p.y, t: e.timeStamp };
  });
  stage.addEventListener("pointermove", (e) => {
    if (!last || finished) return;
    const p = localPoint(stage, e);
    const dt = Math.max(1, e.timeStamp - last.t);
    const dist = Math.hypot(p.x - last.x, p.y - last.y);
    if (dist / p.w / (dt / 1000) > MAX_SPEED) {
      stage.classList.add("too-fast");
      if (e.timeStamp - warned > 1200) {
        warned = e.timeStamp;
        ctx.flash("Too fast! Slow & gentle", "bad");
      }
    } else {
      stage.classList.remove("too-fast");
      const n = Math.max(1, Math.ceil(dist / (p.w * 0.03)));
      for (let s = 1; s <= n; s++) paint(last.x + ((p.x - last.x) * s) / n, last.y + ((p.y - last.y) * s) / n, p.w, p.h);
      update();
    }
    last = { x: p.x, y: p.y, t: e.timeStamp };
  });
  const up = () => {
    last = null;
    stage.classList.remove("too-fast");
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  const reset = el("button", "secondary-btn wide", "↺  Start over");
  reset.addEventListener("click", () => {
    cells.clear();
    c2d.clearRect(0, 0, canvas.width, canvas.height);
    finished = false;
    update();
  });
  ctx.footer.appendChild(reset);
  update();
  return t.clear;
};

// ---------------------------------------------------------------------------------------------

const aftercare: Activity = (ctx) => {
  const t = timers();
  const chat = el("div", "session-chat");
  chat.appendChild(bubble("patient", ctx.def.aftercare.prompt, "🏠"));
  ctx.stage.appendChild(chat);
  ctx.hint("Pick the best tip");
  const tried = new Set<string>();
  const cards = iconCards(
    ctx.def.aftercare.choices,
    (c, card) => {
      if (card.disabled) return;
      if (!c.correct) {
        if (!tried.has(c.label)) {
          tried.add(c.label);
          ctx.penalize();
        }
        card.classList.add("wrong");
        card.disabled = true;
        ctx.flash(c.why, "bad");
        return;
      }
      card.classList.add("right");
      cards.querySelectorAll("button").forEach((b) => (b.disabled = true));
      ctx.flash(c.why, "good");
      chat.appendChild(bubble("patient", ctx.def.goodbye, "😊"));
      t.later(() => ctx.done(), 1300);
    },
    true
  );
  ctx.stage.appendChild(cards);
  return t.clear;
};

export const ACTIVITIES: Partial<Record<StepKind, Activity>> = {
  history,
  inspect,
  referral,
  wash,
  pick,
  squeeze,
  spread,
  aftercare,
};
