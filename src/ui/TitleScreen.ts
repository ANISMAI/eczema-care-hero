import { titleMusic } from "../game/audio";
import { eventBus } from "../game/EventBus";
import { prayerReminders, resetAllProgress, setPrayerReminders, audioOn, setAudioOn, type AudioBus } from "../game/settings";
import { buildTown, type Town } from "../art/town";
import TownTraffic from "./TownTraffic";
import { LANGUAGES, lang, t, type StringKey } from "../game/i18n";
import { setLanguage } from "../game/settings";
import { howToScene } from "./howToScenes";

/** Set before a language-change reload, so the clouds part straight away instead of waiting. */
const QUICK_KEY = "eczema-care-hero-quick-title";

// Opening sequence (shown on top of everything from the first frame):
//   1. the screen is full of fluffy clouds drifting gently (also covers asset loading)
//   2. after ~2 s (and once the clinic is ready) the clouds part from the centre outwards,
//      revealing the town from above (art/town.ts) with the clinic in the middle
//   3. the title and the Play / Settings buttons appear
//   4. Play: the camera dives into the clinic's front door, a soft flash as we step inside,
//      then the clinic interior from above ("title-play"); the scene zooms down to the doctor
// The clinic scene says it is ready with "clinic-ready".

const MIN_CLOUDS_MS = 2000;
const PART_MS = 2200;

/** A puffy cartoon cloud (fill + soft underside) in a 200 x 120 box. */
const CLOUD_SVG = `
<svg viewBox="0 0 200 120" aria-hidden="true">
  <defs>
    <linearGradient id="cloudShade" gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="112">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#d3e3f5"/>
    </linearGradient>
  </defs>
  <g fill="url(#cloudShade)">
    <circle cx="52" cy="74" r="36"/>
    <circle cx="94" cy="52" r="46"/>
    <circle cx="142" cy="66" r="40"/>
    <circle cx="172" cy="86" r="26"/>
    <circle cx="28" cy="92" r="24"/>
    <rect x="26" y="78" width="150" height="34" rx="17"/>
  </g>
</svg>`;

/** Saved day number, to show "Continue · Day N" for a returning player. */
function savedDay(): number | null {
  try {
    const p = JSON.parse(localStorage.getItem("eczema-care-hero-progress-v1") ?? "null");
    return p && p.shift > 1 ? p.shift : null;
  } catch {
    return null;
  }
}

export default class TitleScreen {
  private root: HTMLDivElement;
  private sky: HTMLDivElement;
  private town: Town = buildTown();
  private townBox: HTMLDivElement;
  private townZoom: HTMLDivElement;
  private flash: HTMLDivElement;
  private clouds: { el: HTMLDivElement; dx: number; dy: number; delay: number }[] = [];
  private title: HTMLDivElement;
  private settings: HTMLDivElement;
  private panels: HTMLDivElement[] = [];
  private shownAt = performance.now();
  private parted = false;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "title-screen";
    // the town (under the sky and clouds), with soft cloud shadows drifting over it
    this.townBox = document.createElement("div");
    this.townBox.className = "title-town";
    this.townZoom = document.createElement("div");
    this.townZoom.className = "title-town-zoom";
    this.townZoom.innerHTML = `<img class="town-svg" src="${this.town.url}" alt="" draggable="false" />`;
    // cars and riders on the road, then the drifting cloud shadows over everything
    const traffic = new TownTraffic(this.town);
    this.townZoom.append(traffic.svg);
    this.townZoom.insertAdjacentHTML("beforeend", '<span class="town-shadow a"></span><span class="town-shadow b"></span>');
    traffic.start();
    this.townBox.append(this.townZoom);
    this.root.append(this.townBox);
    this.flash = document.createElement("div");
    this.flash.className = "title-flash";
    this.sky = document.createElement("div");
    this.sky.className = "title-sky";
    this.root.append(this.sky);
    this.makeClouds();

    this.title = document.createElement("div");
    this.title.className = "title-block";
    const day = savedDay();
    this.title.innerHTML = `
      <div class="title-logo">
        <span class="title-logo-top">Eczema Care</span>
        <span class="title-logo-main">HERO</span>
        <span class="title-logo-sub">🩺 ${t("menu.tagline")} 💜</span>
      </div>
      <div class="title-buttons">
        <button class="title-play" type="button">▶&nbsp; ${t("menu.play")}</button>
        ${day ? `<span class="title-continue">${t("menu.continue", { day })}</span>` : ""}
        <div class="title-menu">
          <button class="title-menu-btn" data-open="howto" type="button"><span>❓</span>${t("menu.howTo")}</button>
          <button class="title-menu-btn" data-open="badges" type="button"><span>🏅</span>${t("menu.badges")}</button>
          <button class="title-menu-btn" data-open="language" type="button"><span>🌐</span>${t("menu.language")}</button>
          <button class="title-menu-btn title-settings" data-open="settings" type="button"><span>⚙️</span>${t("menu.settings")}</button>
        </div>
      </div>`;
    this.root.append(this.title);

    this.settings = this.makeSettings();
    const howTo = this.makeHowTo();
    const badges = this.makeBadges();
    const language = this.makeLanguage();
    this.panels = [this.settings, howTo, badges, language];
    this.root.append(...this.panels, this.flash);
    parent.append(this.root);
    titleMusic(true);
    this.layoutTown();
    window.addEventListener("resize", () => this.layoutTown());

    this.title.querySelector(".title-play")!.addEventListener("click", () => this.play());
    const open: Record<string, () => void> = {
      settings: () => this.openSettings(),
      howto: () => this.openPanel(howTo),
      badges: () => this.openPanel(badges),
      language: () => this.openPanel(language),
    };
    this.title.querySelectorAll<HTMLButtonElement>(".title-menu-btn").forEach((b) => b.addEventListener("click", () => open[b.dataset.open!]()));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.panels.filter((pn) => !pn.classList.contains("hidden")).forEach((pn) => this.closePanel(pn));
    });

    // part the clouds once the clinic is drawn and the clouds have had their moment
    // (`?title=off` skips the whole opening, for testing)
    const skip = new URLSearchParams(window.location.search).get("title") === "off";
    if (skip) this.root.classList.add("skipped");
    eventBus.on("clinic-ready", () => {
      if (skip) return this.play();
      let quick = false;
      try {
        quick = sessionStorage.getItem(QUICK_KEY) === "1";
        sessionStorage.removeItem(QUICK_KEY);
      } catch {
        // storage unavailable
      }
      const wait = quick ? 0 : Math.max(0, MIN_CLOUDS_MS - (performance.now() - this.shownAt));
      window.setTimeout(() => this.part(), wait);
    });
  }

  /**
   * Portrait screens: the buttons would cover the road, so the town is drawn a little larger
   * and lifted until the road ends just at the ENTER button (the clinic door stays below the
   * title). Landscape keeps the centred square (the road shows on both sides of the buttons),
   * lowered on short screens just enough that the clinic's roof isn't cut off at the top.
   */
  private layoutTown(): void {
    const box = this.townBox.style;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (this.root.classList.contains("entering")) return;
    if (vh <= vw) {
      const side = vw;
      const centred = (vh - side) / 2;
      const roofOnScreen = 10 - (this.town.clinicTop / this.town.size) * side;
      const top = Math.min(0, Math.max(centred, roofOnScreen));
      box.width = box.height = `${side}px`;
      box.top = `${top}px`;
      box.transform = "translateX(-50%)";
      return;
    }
    // the ENTER button's top (offsets ignore the title's entrance animation)
    let btnTop = 0;
    for (let el: HTMLElement | null = this.title.querySelector<HTMLElement>(".title-play"); el && el !== this.root; el = el.offsetParent as HTMLElement | null) {
      btnTop += el.offsetTop;
    }
    const roadEnd = this.town.road.bottom / this.town.size; // 0..1 down the image
    const target = btnTop + 6; // the road's lower edge, just under the button's top
    const side = Math.max(vw, vh, (vh - target) / (1 - roadEnd));
    const top = Math.min(0, Math.max(vh - side, target - roadEnd * side));
    box.width = box.height = `${side}px`;
    box.top = `${top}px`;
    box.transform = "translateX(-50%)";
  }

  // ---------- clouds ----------

  /** Enough overlapping clouds to cover the screen, on a jittered grid with a margin. */
  private makeClouds(): void {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const stepX = Math.min(170, Math.max(120, W / 4));
    const stepY = stepX * 0.62;
    const cx = W / 2;
    const cy = H / 2;
    const maxD = Math.hypot(cx, cy) + stepX;
    for (let y = -stepY / 2; y < H + stepY; y += stepY) {
      const row = Math.round(y / stepY);
      for (let x = -stepX / 2 + (row % 2 ? stepX / 2 : 0); x < W + stepX; x += stepX) {
        const px = x + (Math.random() - 0.5) * stepX * 0.5;
        const py = y + (Math.random() - 0.5) * stepY * 0.5;
        const w = stepX * (1.5 + Math.random() * 0.7);
        const el = document.createElement("div");
        el.className = "title-cloud";
        el.style.left = `${px - w / 2}px`;
        el.style.top = `${py - w * 0.3}px`;
        el.style.width = `${w}px`;
        el.innerHTML = `<div class="title-cloud-float" style="animation-delay:${(-Math.random() * 6).toFixed(2)}s">${CLOUD_SVG}</div>`;
        this.root.append(el);
        // part outwards from the centre: direction away from the middle, centre clouds first
        let dx = px - cx;
        let dy = py - cy;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 20) {
          const a = Math.random() * Math.PI * 2;
          dx = Math.cos(a);
          dy = Math.sin(a);
        }
        const len = Math.hypot(dx, dy);
        const ux = dx / len;
        const uy = dy / len;
        // only as far as it takes to leave the screen: edge clouds drift, middle ones travel
        const toX = ux > 0.01 ? (W - px) / ux : ux < -0.01 ? px / -ux : Infinity;
        const toY = uy > 0.01 ? (H - py) / uy : uy < -0.01 ? py / -uy : Infinity;
        const travel = Math.max(0, Math.min(toX, toY)) + w * 0.9;
        this.clouds.push({ el, dx: ux * travel, dy: uy * travel, delay: (d / maxD) * 350 });
      }
    }
  }

  private part(): void {
    if (this.parted) return;
    this.parted = true;
    this.root.classList.add("parting");
    for (const c of this.clouds) {
      // two delays: the move starts first (centre clouds earliest), the fade comes later
      c.el.style.transitionDelay = `${c.delay}ms, ${c.delay + 1000}ms`;
      c.el.style.transform = this.reduced ? "none" : `translate(${c.dx}px, ${c.dy}px) scale(1.15)`;
      c.el.style.opacity = "0";
    }
    window.setTimeout(() => {
      this.clouds.forEach((c) => c.el.remove());
      this.clouds = [];
      this.root.classList.add("show-title");
      (this.title.querySelector(".title-play") as HTMLButtonElement).focus({ preventScroll: true });
    }, this.reduced ? 400 : PART_MS);
  }

  // ---------- buttons ----------

  /** Play: dive into the clinic door, flash as we step inside, then hand over to the scene. */
  private play(): void {
    if (this.root.classList.contains("entering")) return;
    this.root.classList.add("entering");
    titleMusic(false);
    if (this.root.classList.contains("skipped") || this.reduced) {
      eventBus.emit("title-play");
      this.root.classList.add("leaving");
      window.setTimeout(() => this.root.remove(), 600);
      return;
    }
    // the door in the town's own pixels, and the move + zoom that bring it to the screen centre
    const box = this.townBox.getBoundingClientRect();
    const k = box.width / this.town.size;
    const doorX = this.town.door.x * k;
    const doorY = this.town.door.y * k;
    const midX = window.innerWidth / 2 - box.left;
    const midY = window.innerHeight / 2 - box.top;
    this.townZoom.style.transformOrigin = `${doorX}px ${doorY}px`;
    this.townZoom.style.transform = `translate(${midX - doorX}px, ${midY - doorY}px) scale(9)`;
    window.setTimeout(() => this.flash.classList.add("on"), 1150);
    window.setTimeout(() => {
      // inside: the clinic interior from above shows behind the fading flash
      eventBus.emit("title-play");
      this.townBox.remove();
      this.sky.remove();
      this.title.remove();
      this.flash.classList.remove("on");
      this.flash.classList.add("out");
      window.setTimeout(() => this.root.remove(), 700);
    }, 1550);
  }

  private makeSettings(): HTMLDivElement {
    const box = document.createElement("div");
    box.className = "title-settings-panel hidden";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", t("menu.settings"));
    box.innerHTML = `
      <div class="ts-card">
        <h2>⚙️ ${t("menu.settings")}</h2>
        ${(["ambience", "effects", "music"] as const).map((bus) => `
        <label class="ts-row">
          <span><strong>${t(`settings.${bus}`)}</strong><small>${t(`settings.${bus}Hint`)}</small></span>
          <input type="checkbox" class="ts-toggle ts-${bus}" />
          <span class="ts-switch" aria-hidden="true"></span>
        </label>`).join("")}
        <label class="ts-row">
          <span><strong>${t("settings.prayer")}</strong><small>${t("settings.prayerHint")}</small></span>
          <input type="checkbox" class="ts-toggle ts-prayer" />
          <span class="ts-switch" aria-hidden="true"></span>
        </label>
        <div class="ts-row ts-reset-row">
          <span><strong>${t("settings.reset")}</strong><small>${t("settings.resetHint")}</small></span>
          <button type="button" class="ts-reset">${t("settings.resetBtn")}</button>
        </div>
        <button type="button" class="primary-btn wide ts-close">${t("menu.done")}</button>
      </div>`;
    for (const bus of ["ambience", "effects", "music"] as AudioBus[]) {
      const toggle = box.querySelector<HTMLInputElement>(`.ts-${bus}`)!;
      toggle.addEventListener("change", () => setAudioOn(bus, toggle.checked));
    }
    const prayer = box.querySelector<HTMLInputElement>(".ts-prayer")!;
    prayer.addEventListener("change", () => setPrayerReminders(prayer.checked));
    const reset = box.querySelector<HTMLButtonElement>(".ts-reset")!;
    reset.addEventListener("click", () => {
      if (reset.dataset.confirm) {
        resetAllProgress();
        window.location.reload();
        return;
      }
      reset.dataset.confirm = "1";
      reset.textContent = t("settings.resetConfirm");
      reset.classList.add("confirm");
    });
    box.querySelector(".ts-close")!.addEventListener("click", () => this.closeSettings());
    box.addEventListener("click", (e) => {
      if (e.target === box) this.closeSettings();
    });
    return box;
  }

  private openSettings(): void {
    for (const bus of ["ambience", "effects", "music"] as AudioBus[]) {
      this.settings.querySelector<HTMLInputElement>(`.ts-${bus}`)!.checked = audioOn(bus);
    }
    this.settings.querySelector<HTMLInputElement>(".ts-prayer")!.checked = prayerReminders();
    const reset = this.settings.querySelector<HTMLButtonElement>(".ts-reset")!;
    delete reset.dataset.confirm;
    reset.textContent = t("settings.resetBtn");
    reset.classList.remove("confirm");
    this.settings.classList.remove("hidden");
  }

  private closeSettings(): void {
    this.closePanel(this.settings);
  }

  // ---------- menu panels ----------

  /** A panel in the same style as Settings: a card with a title, a body and a footer. */
  private panel(title: string, cls: string): { box: HTMLDivElement; body: HTMLDivElement; foot: HTMLDivElement } {
    const box = document.createElement("div");
    box.className = `title-settings-panel hidden ${cls}`;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", title);
    const card = document.createElement("div");
    card.className = "ts-card";
    const h = document.createElement("h2");
    h.textContent = title;
    const body = document.createElement("div");
    body.className = "tm-body";
    const foot = document.createElement("div");
    foot.className = "tm-foot";
    card.append(h, body, foot);
    box.append(card);
    box.addEventListener("click", (e) => {
      if (e.target === box) this.closePanel(box);
    });
    return { box, body, foot };
  }

  private doneButton(box: HTMLDivElement, label = t("menu.done")): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "primary-btn wide";
    b.textContent = label;
    b.addEventListener("click", () => this.closePanel(box));
    return b;
  }

  private openPanel(box: HTMLDivElement): void {
    box.classList.remove("hidden");
    box.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }

  private closePanel(box: HTMLDivElement): void {
    box.classList.add("hidden");
    this.title.querySelector<HTMLButtonElement>(".title-play")?.focus({ preventScroll: true });
  }

  /** How to play: six short picture cards, swipe or Back / Next. */
  private makeHowTo(): HTMLDivElement {
    const { box, body, foot } = this.panel(`❓ ${t("howTo.title")}`, "tm-howto");
    const slides = [1, 2, 3, 4, 5, 6].map((_, i) => {
      const n = i + 1;
      const slide = document.createElement("div");
      slide.className = "tm-slide";
      slide.innerHTML =
        `<div class="tm-slide-scene" aria-hidden="true">${howToScene(n)}</div>` +
        `<strong>${t(`howTo.${n}.title` as StringKey)}</strong><p>${t(`howTo.${n}.text` as StringKey)}</p>`;
      return slide;
    });
    const track = document.createElement("div");
    track.className = "tm-track";
    track.append(...slides);
    const dots = document.createElement("div");
    dots.className = "tm-dots";
    const dotEls = slides.map(() => dots.appendChild(document.createElement("span")));
    body.append(track, dots);

    const back = document.createElement("button");
    back.type = "button";
    back.className = "secondary-btn";
    back.textContent = t("menu.back");
    const next = document.createElement("button");
    next.type = "button";
    next.className = "primary-btn";
    foot.classList.add("row");
    foot.append(back, next);

    let index = 0;
    const show = (i: number) => {
      index = Math.max(0, Math.min(slides.length - 1, i));
      track.style.transform = `translateX(${-index * 100}%)`;
      dotEls.forEach((d, k) => d.classList.toggle("on", k === index));
      back.disabled = index === 0;
      next.textContent = index === slides.length - 1 ? t("menu.gotIt") : t("menu.next");
    };
    back.addEventListener("click", () => show(index - 1));
    next.addEventListener("click", () => (index === slides.length - 1 ? this.closePanel(box) : show(index + 1)));
    let startX: number | null = null;
    track.addEventListener("pointerdown", (e) => (startX = e.clientX));
    track.addEventListener("pointerup", (e) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 40) show(index + (dx < 0 ? 1 : -1));
    });
    show(0);
    return box;
  }

  /** Badges: the shelf is ready; the collection itself comes later. */
  private makeBadges(): HTMLDivElement {
    const { box, body, foot } = this.panel(`🏅 ${t("badges.title")}`, "tm-badges");
    const shelf = document.createElement("div");
    shelf.className = "tm-shelf";
    for (let i = 0; i < 8; i++) {
      const slot = document.createElement("span");
      slot.className = "tm-badge-slot";
      slot.textContent = "?";
      shelf.append(slot);
    }
    const note = document.createElement("div");
    note.className = "tm-note";
    note.innerHTML = `<strong>${t("badges.soon")}</strong><span>${t("badges.hint")}</span>`;
    body.append(shelf, note);
    foot.append(this.doneButton(box));
    return box;
  }

  /** Language: picking one saves it and reloads, so every label (and room plaque) follows. */
  private makeLanguage(): HTMLDivElement {
    const { box, body, foot } = this.panel(`🌐 ${t("language.title")}`, "tm-language");
    for (const l of LANGUAGES) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `tm-lang${l.id === lang() ? " on" : ""}`;
      b.innerHTML = `<span class="tm-flag">${l.code}</span><strong>${l.name}</strong><span class="tm-check">✓</span>`;
      b.addEventListener("click", () => {
        if (l.id === lang()) return this.closePanel(box);
        setLanguage(l.id);
        try {
          sessionStorage.setItem(QUICK_KEY, "1");
        } catch {
          // storage unavailable: the clouds just take their usual moment
        }
        window.location.reload();
      });
      body.append(b);
    }
    const note = document.createElement("p");
    note.className = "tm-small";
    note.textContent = t("language.note");
    body.append(note);
    foot.append(this.doneButton(box));
    return box;
  }
}
