import type { InteractableDef } from "../data/rooms";
import type { PlayableCharacter } from "../data/assets";

const JOYSTICK_RADIUS = 40;

export interface HUDCallbacks {
  onJoystickMove: (x: number, y: number) => void;
  onInteract: () => void;
  onMiniMapTap: () => void;
  onAvatarTap: () => void;
  onStaffTap: () => void;
}

/** Mobile HUD: top-left stats, top-right mini-map mount, bottom-left joystick, bottom-right interact. */
export default class HUD {
  root: HTMLDivElement;
  miniMapMount: HTMLButtonElement;
  private interactBtn: HTMLButtonElement;
  private interactIcon: HTMLSpanElement;
  private interactLabel: HTMLSpanElement;
  private interactTargetId: string | null = null;
  private avatarBtn: HTMLButtonElement;
  private avatarFace: HTMLSpanElement;
  private levelLabel: HTMLSpanElement;
  private coinsLabel: HTMLSpanElement;
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
    this.avatarBtn.setAttribute("aria-label", "Change character");
    this.avatarFace = document.createElement("span");
    this.avatarFace.className = "hud-avatar-face";
    this.avatarBtn.appendChild(this.avatarFace);
    this.avatarBtn.addEventListener("click", callbacks.onAvatarTap);
    const pills = document.createElement("div");
    pills.className = "hud-pills";
    pills.append(this.pill("⭐", this.levelLabel), this.pill("🪙", this.coinsLabel));
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
    staffBtn.className = "hud-side-btn";
    staffBtn.setAttribute("aria-label", "Staff directory");
    staffBtn.innerHTML = "<span>👥</span><span>Staff</span>";
    staffBtn.addEventListener("click", callbacks.onStaffTap);
    right.append(staffBtn, this.miniMapMount);

    this.root.append(statsBar, right, this.toast, joystickBase, this.interactBtn);
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

  /** Shows the Interact button for the given target, or hides it when null. */
  setInteractTarget(item: InteractableDef | null): void {
    const id = item?.id ?? null;
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
    this.avatarBtn.setAttribute("aria-label", `Change character (${character.label})`);
  }

  setStats(level: number, coins: number): void {
    this.levelLabel.textContent = `Lv ${level}`;
    this.coinsLabel.textContent = `${coins}`;
  }
}
