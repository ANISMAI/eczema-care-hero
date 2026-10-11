import { STAFF } from "../data/staff";
import type { CharacterId } from "../data/assets";
import { cardCloseButton, el, renderIdCard } from "./IdCard";

export interface ProfileCallbacks {
  onChangeCharacter: () => void;
  onClose: () => void;
}

/** "My Profile": the player's own staff ID card, opened from the avatar button in the HUD. */
export default class ProfileCard {
  private root: HTMLDivElement;
  private cardHost: HTMLDivElement;
  private callbacks: ProfileCallbacks;

  constructor(parent: HTMLElement, callbacks: ProfileCallbacks) {
    this.callbacks = callbacks;
    this.root = el("div", "modal-overlay hidden staff-overlay");
    const wrap = el("div", "staff-wrap");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "My profile");

    const title = el("div", "staff-title");
    title.append(el("span", "", "🪪"), el("span", "", "My Profile"));

    const stage = el("div", "staff-stage");
    this.cardHost = el("div", "staff-card-host");
    const frame = el("div", "staff-card-frame");
    frame.append(this.cardHost, cardCloseButton(() => this.close()));
    stage.appendChild(frame);

    const actions = el("div", "modal-actions staff-actions");
    const change = el("button", "primary-btn", "Change doctor");
    change.addEventListener("click", () => {
      this.root.classList.add("hidden");
      this.callbacks.onChangeCharacter();
    });
    actions.append(change);

    const notice = el(
      "p",
      "app-notice",
      "Eczema Care Hero is an educational game, not a medical or diagnostic tool. Eczema differs for everyone; always follow a healthcare professional's advice."
    );
    wrap.append(title, stage, actions, notice);
    this.root.appendChild(wrap);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) this.close();
    });
    window.addEventListener("keydown", (e) => {
      if (this.isOpen && e.key === "Escape") this.close();
    });
    parent.appendChild(this.root);
  }

  open(character: CharacterId): void {
    const card = STAFF.find((c) => c.characterId === character);
    if (!card) return;
    this.cardHost.replaceChildren(renderIdCard(card, { badge: "you" }));
    this.root.classList.remove("hidden");
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.callbacks.onClose();
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}
