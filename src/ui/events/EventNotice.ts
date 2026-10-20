import { el } from "../case/Overlay";
import type { ClinicEventDef } from "../../events/types";

export interface EventNoticeCallbacks {
  /** Walk to the event's room. */
  onGo: () => void;
  onDismiss: () => void;
}

const COLLAPSE_MS = 9000;

/**
 * HUD notice for an optional event, under the objective banner. Expanded: who is asking and
 * why, with Go / Later / Dismiss. Compact (after "Later" or a few seconds): a small chip that
 * stays while the event is available. Never blocks movement or the patient case.
 */
export default class EventNotice {
  private root: HTMLDivElement;
  private hud: HTMLElement;
  private cb: EventNoticeCallbacks;
  private timer = 0;

  constructor(hud: HTMLElement, cb: EventNoticeCallbacks) {
    this.hud = hud;
    this.cb = cb;
    this.root = el("div", "event-notice hidden");
    this.root.setAttribute("role", "status");
    this.root.setAttribute("aria-live", "polite");
    hud.append(this.root);
  }

  show(def: ClinicEventDef, expanded: boolean): void {
    window.clearTimeout(this.timer);
    this.root.classList.remove("hidden");
    this.hud.classList.add("has-event");
    this.root.classList.toggle("expanded", expanded);
    this.root.replaceChildren();

    const go = el("button", "event-go", "Go ›");
    go.addEventListener("click", () => {
      this.compact(def);
      this.cb.onGo();
    });

    if (!expanded) {
      const label = el("span", "event-chip-text");
      label.append(el("strong", "", "!"), document.createTextNode(def.title));
      const x = el("button", "event-x", "✕");
      x.setAttribute("aria-label", `Dismiss: ${def.title}`);
      x.addEventListener("click", () => this.cb.onDismiss());
      this.root.append(label, go, x);
      return;
    }

    const img = el("img", "event-face");
    img.src = def.from.portrait;
    img.alt = "";
    const text = el("div", "event-text");
    text.append(el("strong", "", `${def.icon} ${def.from.name}`), el("span", "", def.notice), el("em", "", "Optional · bonus coins"));
    const later = el("button", "event-later", "Later");
    later.addEventListener("click", () => this.compact(def));
    const dismiss = el("button", "event-later", "Dismiss");
    dismiss.addEventListener("click", () => this.cb.onDismiss());
    const actions = el("div", "event-btns");
    actions.append(go, later, dismiss);
    this.root.append(img, text, actions);
    this.timer = window.setTimeout(() => this.compact(def), COLLAPSE_MS);
  }

  compact(def: ClinicEventDef): void {
    if (this.root.classList.contains("hidden")) return;
    this.show(def, false);
  }

  hide(): void {
    window.clearTimeout(this.timer);
    this.root.classList.add("hidden");
    this.hud.classList.remove("has-event");
  }
}
