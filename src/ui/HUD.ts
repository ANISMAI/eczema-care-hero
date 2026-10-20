import type { InteractableDef } from "../data/rooms";
import type { PlayableCharacter } from "../data/assets";
import { STAFF } from "../data/staff";

const JOYSTICK_RADIUS = 40;

export interface HUDCallbacks {
  onJoystickMove: (x: number, y: number) => void;
  onInteract: () => void;
  onMiniMapTap: () => void;
  onAvatarTap: () => void;
  onStaffTap: () => void;
  /** Objective banner tapped: take the player to the next destination. */
  onObjectiveTap: () => void;
}

/** Mobile HUD: top-left stats, top-right mini-map mount, bottom-left joystick, bottom-right interact. */
export default class HUD {
  root: HTMLDivElement;
  miniMapMount: HTMLButtonElement;
  /** Column under the stats: task card (objective + queue), then the event notice. */
  stack: HTMLDivElement;
  /** Where the doctor queue strip goes: its own panel under the mini-map. */
  queueMount: HTMLDivElement;
  private interactBtn: HTMLButtonElement;
  private interactIcon: HTMLSpanElement;
  private interactLabel: HTMLSpanElement;
  private interactTargetId: string | null = null;
  private objective: HTMLButtonElement;
  private objectiveText: HTMLSpanElement;
  private objectiveFill: HTMLSpanElement;
  private avatarBtn: HTMLButtonElement;
  private avatarFace: HTMLSpanElement;
  private levelLabel: HTMLSpanElement;
  private coinsLabel: HTMLSpanElement;
  private clockLabel: HTMLSpanElement;
  private toast: HTMLDivElement;
  private toastTimer: number | undefined;
  private joystickThumb: HTMLDivElement;
  private joystickActive = false;
  private joystickOrigin = { x: 0, y: 0 };
  private activePointerId: number | null = null;

  constructor(parent: HTMLElement, callbacks: HUDCallbacks) {
    this.root = document.createElement("div");
    this.root.className = "hud-root";

    // Top-left: level + coins
    const statsBar = document.createElement("div");
    statsBar.className = "hud-stats";
    this.levelLabel = document.createElement("span");
    this.coinsLabel = document.createElement("span");
    // Current character's face; tap to change character
    this.avatarBtn = document.createElement("button");
    this.avatarBtn.className = "hud-avatar";
    this.avatarBtn.setAttribute("aria-label", "My profile");
    this.avatarFace = document.createElement("span");
    this.avatarFace.className = "hud-avatar-face";
    this.avatarBtn.appendChild(this.avatarFace);
    this.avatarBtn.addEventListener("click", callbacks.onAvatarTap);
    const pills = document.createElement("div");
    pills.className = "hud-pills";
    this.clockLabel = document.createElement("span");
    this.clockLabel.textContent = "8:00 AM";
    const clock = this.pill("🕘", this.clockLabel);
    clock.classList.add("hud-clock");
    pills.append(this.pill("⭐", this.levelLabel), this.pill("🪙", this.coinsLabel), clock);
    statsBar.append(this.avatarBtn, pills);
    this.setStats(1, 0);

    // Top-right: mini-map card
    this.miniMapMount = document.createElement("button");
    this.miniMapMount.className = "hud-minimap";
    this.miniMapMount.setAttribute("aria-label", "Open clinic map");
    const mapCaption = document.createElement("span");
    mapCaption.className = "hud-minimap-caption";
    mapCaption.textContent = "MAP";
    this.miniMapMount.appendChild(mapCaption);

    // Top-centre: room name toast
    this.toast = document.createElement("div");
    this.toast.className = "hud-toast";

    // Bottom-left: virtual joystick
    const joystickBase = document.createElement("div");
    joystickBase.className = "hud-joystick-base";
    this.joystickThumb = document.createElement("div");
    this.joystickThumb.className = "hud-joystick-thumb";
    joystickBase.appendChild(this.joystickThumb);

    // Bottom-right: interact button
    this.interactBtn = document.createElement("button");
    this.interactBtn.className = "hud-interact-btn hidden";
    this.interactIcon = document.createElement("span");
    this.interactIcon.className = "hud-interact-icon";
    const textWrap = document.createElement("span");
    textWrap.className = "hud-interact-text";
    const verb = document.createElement("strong");
    verb.textContent = "Interact";
    this.interactLabel = document.createElement("span");
    textWrap.append(verb, this.interactLabel);
    this.interactBtn.append(this.interactIcon, textWrap);
    this.interactBtn.addEventListener("click", callbacks.onInteract);

    // Top-right row: side buttons, then the mini-map in the corner
    const right = document.createElement("div");
    right.className = "hud-right";
    const staffBtn = document.createElement("button");
    // a mini staff ID card on a lanyard, with three team members' faces
    staffBtn.className = "hud-staff-btn";
    staffBtn.setAttribute("aria-label", "Staff directory");
    const faces = ["nurul", "jason", "grace"]
      .map((id) => STAFF.find((s) => s.id === id)?.portrait)
      .filter(Boolean)
      .map((src) => `<img src="${src}" alt="" draggable="false">`)
      .join("");
    staffBtn.innerHTML =
      `<span class="mini-swing"><span class="mini-lanyard"></span><span class="mini-clip"></span>` +
      `<span class="mini-card"><span class="mini-head"></span>` +
      `<span class="mini-faces">${faces}</span><span class="mini-label">Staff</span></span></span>`;
    staffBtn.addEventListener("click", callbacks.onStaffTap);
    right.append(staffBtn, this.miniMapMount);

    // Under the top row: current case objective, tap to walk there
    this.objective = document.createElement("button");
    this.objective.className = "hud-objective hidden";
    this.objectiveText = document.createElement("span");
    this.objectiveText.className = "hud-objective-text";
    const go = document.createElement("span");
    go.className = "hud-objective-go";
    go.textContent = "Go ›";
    // case tracker: how far through the patient's visit
    const track = document.createElement("span");
    track.className = "hud-objective-track";
    this.objectiveFill = document.createElement("span");
    track.append(this.objectiveFill);
    this.objective.append(this.objectiveText, go, track);
    this.objective.addEventListener("click", callbacks.onObjectiveTap);

    // Task card (the objective banner), stacked with the event notice so they never overlap
    // whatever their height.
    this.stack = document.createElement("div");
    this.stack.className = "hud-stack";
    const card = document.createElement("div");
    card.className = "task-card";
    card.append(this.objective);
    this.stack.append(card);

    // Doctor queue: its own horizontal panel under the mini-map (QueuePanel mounts here)
    this.queueMount = document.createElement("div");
    this.queueMount.className = "queue-dock";
    right.append(this.queueMount);

    this.root.append(statsBar, right, this.stack, this.toast, joystickBase, this.interactBtn);
    parent.appendChild(this.root);

    this.setupJoystick(joystickBase, callbacks.onJoystickMove);
    this.miniMapMount.addEventListener("click", callbacks.onMiniMapTap);
  }

  private pill(icon: string, value: HTMLSpanElement): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "hud-pill";
    const i = document.createElement("span");
    i.className = "hud-pill-icon";
    i.textContent = icon;
    el.append(i, value);
    return el;
  }

  private setupJoystick(base: HTMLDivElement, onMove: (x: number, y: number) => void): void {
    const handleStart = (e: PointerEvent) => {
      this.joystickActive = true;
      this.activePointerId = e.pointerId;
      const rect = base.getBoundingClientRect();
      this.joystickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      base.setPointerCapture(e.pointerId);
      base.classList.add("active");
      handleMove(e);
    };

    const handleMove = (e: PointerEvent) => {
      if (!this.joystickActive || e.pointerId !== this.activePointerId) return;
      let dx = e.clientX - this.joystickOrigin.x;
      let dy = e.clientY - this.joystickOrigin.y;
      const dist = Math.hypot(dx, dy);
      if (dist > JOYSTICK_RADIUS) {
        dx = (dx / dist) * JOYSTICK_RADIUS;
        dy = (dy / dist) * JOYSTICK_RADIUS;
      }
      this.joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;
      onMove(dx / JOYSTICK_RADIUS, dy / JOYSTICK_RADIUS);
    };

    const handleEnd = (e: PointerEvent) => {
      if (e.pointerId !== this.activePointerId) return;
      this.joystickActive = false;
      this.activePointerId = null;
      base.classList.remove("active");
      this.joystickThumb.style.transform = "translate(0px, 0px)";
      onMove(0, 0);
    };

    base.addEventListener("pointerdown", handleStart);
    base.addEventListener("pointermove", handleMove);
    base.addEventListener("pointerup", handleEnd);
    base.addEventListener("pointercancel", handleEnd);
  }

  /**
   * Shows the current case objective ("Case #001 · Talk to Amina…") and how far through the
   * visit the case is (0..1), or hides the banner.
   */
  setObjective(text: string | null, progress = 0): void {
    this.objective.classList.toggle("hidden", !text);
    if (!text) return;
    this.objectiveFill.style.width = `${Math.round(progress * 100)}%`;
    const [title, rest] = text.split(" · ");
    this.objectiveText.replaceChildren();
    const tag = document.createElement("strong");
    tag.textContent = rest ? title : "Next";
    this.objectiveText.append(tag, document.createTextNode(rest ?? title));
    this.objective.setAttribute("aria-label", `Objective: ${text}. Tap to go there.`);
  }

  /** Shows the Interact button for the given target, or hides it when null. */
  setInteractTarget(item: InteractableDef | null): void {
    const id = item ? `${item.id}|${item.label}` : null;
    if (id === this.interactTargetId) return;
    this.interactTargetId = id;
    this.interactBtn.classList.toggle("hidden", !item);
    if (item) {
      this.interactIcon.textContent = item.kind === "npc" ? "💬" : item.icon;
      this.interactLabel.textContent = item.label;
    }
  }

  /** Briefly shows the name of the area the player just entered. Non-blocking. */
  showRoomToast(text: string): void {
    this.toast.textContent = text;
    this.toast.classList.remove("show");
    void this.toast.offsetWidth; // restart the CSS transition
    this.toast.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toast.classList.remove("show"), 1800);
  }

  /** Shows the character's head (cropped from its spritesheet) on the avatar button. */
  setAvatar(character: PlayableCharacter | undefined): void {
    if (!character) {
      this.avatarFace.style.backgroundImage = "";
      this.avatarFace.textContent = "👤";
      return;
    }
    const { sheet } = character;
    const scale = 72 / sheet.frameHeight; // head fills the 40px circle
    const fw = sheet.frameWidth * scale;
    this.avatarFace.textContent = "";
    this.avatarFace.style.backgroundImage = `url("${sheet.url}")`;
    this.avatarFace.style.backgroundSize = `${fw * 3}px ${sheet.frameHeight * 4 * scale}px`;
    this.avatarFace.style.backgroundPosition = `${20 - fw / 2}px ${-sheet.rows.down * sheet.frameHeight * scale - 2}px`;
    this.avatarBtn.setAttribute("aria-label", `My profile (${character.label})`);
  }

  setClock(text: string): void {
    if (this.clockLabel.textContent !== text) this.clockLabel.textContent = text;
  }

  setStats(level: number, coins: number): void {
    this.levelLabel.textContent = `Lv ${level}`;
    this.coinsLabel.textContent = `${coins}`;
  }
}
