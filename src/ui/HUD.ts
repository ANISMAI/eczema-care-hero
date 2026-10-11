const JOYSTICK_RADIUS = 44;

export interface HUDCallbacks {
  onJoystickMove: (x: number, y: number) => void;
  onInteract: () => void;
  onMiniMapTap: () => void;
}

/** Mobile HUD: top-left stats, top-right mini-map mount, bottom-left joystick, bottom-right interact. */
export default class HUD {
  root: HTMLDivElement;
  miniMapMount: HTMLDivElement;
  private interactBtn: HTMLButtonElement;
  private levelLabel: HTMLSpanElement;
  private coinsLabel: HTMLSpanElement;
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
    this.levelLabel.textContent = "Lv.1";
    this.coinsLabel = document.createElement("span");
    this.coinsLabel.textContent = "🪙 0";
    statsBar.append(this.levelLabel, this.coinsLabel);

    // Top-right: mini-map mount point
    this.miniMapMount = document.createElement("div");
    this.miniMapMount.className = "hud-minimap-mount";

    // Bottom-left: virtual joystick
    const joystickBase = document.createElement("div");
    joystickBase.className = "hud-joystick-base";
    this.joystickThumb = document.createElement("div");
    this.joystickThumb.className = "hud-joystick-thumb";
    joystickBase.appendChild(this.joystickThumb);

    // Bottom-right: interact button
    this.interactBtn = document.createElement("button");
    this.interactBtn.className = "hud-interact-btn hidden";
    this.interactBtn.textContent = "Interact";
    this.interactBtn.addEventListener("click", callbacks.onInteract);

    this.root.append(statsBar, this.miniMapMount, joystickBase, this.interactBtn);
    parent.appendChild(this.root);

    this.setupJoystick(joystickBase, callbacks.onJoystickMove);
    this.miniMapMount.addEventListener("click", callbacks.onMiniMapTap);
  }

  private setupJoystick(base: HTMLDivElement, onMove: (x: number, y: number) => void): void {
    const handleStart = (e: PointerEvent) => {
      this.joystickActive = true;
      this.activePointerId = e.pointerId;
      const rect = base.getBoundingClientRect();
      this.joystickOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      base.setPointerCapture(e.pointerId);
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
      this.joystickThumb.style.transform = "translate(0px, 0px)";
      onMove(0, 0);
    };

    base.addEventListener("pointerdown", handleStart);
    base.addEventListener("pointermove", handleMove);
    base.addEventListener("pointerup", handleEnd);
    base.addEventListener("pointercancel", handleEnd);
  }

  setInteractVisible(visible: boolean, label?: string): void {
    this.interactBtn.classList.toggle("hidden", !visible);
    if (label) this.interactBtn.textContent = label;
  }

  setStats(level: number, coins: number): void {
    this.levelLabel.textContent = `Lv.${level}`;
    this.coinsLabel.textContent = `🪙 ${coins}`;
  }
}
