import { STAFF } from "../data/staff";
import type { CharacterId } from "../data/assets";
import { cardCloseButton, el, renderIdCard } from "./IdCard";
import { t, type Lang } from "../game/i18n";
import SettingsPanel from "./SettingsPanel";

export interface ProfileCallbacks {
  onChangeCharacter: () => void;
  onExit: () => void;
  onClose: () => void;
  onLanguageChange: (language: Lang) => void;
}

/** "My Profile": the player's own staff ID card, opened from the avatar button in the HUD. */
export default class ProfileCard {
  private root: HTMLDivElement;
  private cardHost: HTMLDivElement;
  private wrap: HTMLDivElement;
  private confirmation: HTMLDivElement;
  private exitButton: HTMLButtonElement;
  private cancelButton: HTMLButtonElement;
  private previousFocus: HTMLElement | null = null;
  private callbacks: ProfileCallbacks;
  private settings: SettingsPanel;
  private settingsButton: HTMLButtonElement;

  constructor(parent: HTMLElement, callbacks: ProfileCallbacks) {
    this.callbacks = callbacks;
    this.root = el("div", "modal-overlay hidden staff-overlay profile-overlay");
    const wrap = this.wrap = el("div", "staff-wrap");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", t("profile.title"));
    wrap.setAttribute("aria-modal", "true");

    const title = el("div", "staff-title");
    title.append(el("span", "", "🪪"), el("span", "", t("profile.title")));

    const stage = el("div", "staff-stage");
    this.cardHost = el("div", "staff-card-host");
    const frame = el("div", "staff-card-frame");
    frame.append(this.cardHost, cardCloseButton(() => this.close()));
    stage.appendChild(frame);

    const actions = el("div", "modal-actions staff-actions profile-actions");
    this.settingsButton = el("button", "secondary-btn profile-settings", `⚙️ ${t("menu.settings")}`);
    this.settingsButton.addEventListener("click", () => this.openSettings());
    const change = el("button", "primary-btn", t("profile.change"));
    change.addEventListener("click", () => {
      this.root.classList.add("hidden");
      this.callbacks.onChangeCharacter();
    });
    this.exitButton = el("button", "secondary-btn profile-exit", t("profile.exit"));
    this.exitButton.addEventListener("click", () => {
      this.wrap.classList.add("hidden");
      this.confirmation.classList.remove("hidden");
      this.cancelButton.focus({ preventScroll: true });
    });
    actions.append(this.settingsButton, change, this.exitButton);

    const notice = el(
      "p",
      "app-notice",
      t("profile.notice")
    );
    wrap.append(title, stage, actions, notice);
    this.confirmation = el("div", "modal-card profile-exit-card hidden");
    this.confirmation.setAttribute("role", "alertdialog");
    this.confirmation.setAttribute("aria-modal", "true");
    this.confirmation.setAttribute("aria-labelledby", "profile-exit-title");
    this.confirmation.setAttribute("aria-describedby", "profile-exit-description");
    const exitTitle = el("h2", "", t("profile.exitTitle"));
    exitTitle.id = "profile-exit-title";
    const exitDescription = el("p", "", t("profile.exitDescription"));
    exitDescription.id = "profile-exit-description";
    const exitActions = el("div", "modal-actions");
    this.cancelButton = el("button", "secondary-btn", t("profile.cancelExit"));
    this.cancelButton.addEventListener("click", () => this.cancelExit());
    const confirm = el("button", "primary-btn profile-confirm-exit", t("profile.confirmExit"));
    confirm.addEventListener("click", () => {
      this.root.classList.add("hidden");
      this.callbacks.onExit();
    });
    exitActions.append(this.cancelButton, confirm);
    this.confirmation.append(exitTitle, exitDescription, exitActions);
    this.root.append(wrap, this.confirmation);
    this.root.addEventListener("click", (e) => {
      if (e.target === this.root) {
        if (this.confirmingExit) this.cancelExit();
        else this.close();
      }
    });
    window.addEventListener("keydown", (e) => {
      if (!this.isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (this.confirmingExit) this.cancelExit();
        else this.close();
      }
      if (e.key === "Tab") {
        const panel = this.confirmingExit ? this.confirmation : this.wrap;
        const buttons = Array.from(panel.querySelectorAll<HTMLButtonElement>("button"));
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = (index + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
        e.preventDefault();
        buttons[next]?.focus({ preventScroll: true });
      }
    });
    parent.appendChild(this.root);
    this.settings = new SettingsPanel(parent, {
      onLanguageChange: (language) => this.callbacks.onLanguageChange(language),
      onClose: () => {
        this.root.classList.remove("hidden");
        this.settingsButton.focus({ preventScroll: true });
      },
    });
  }

  openSettings(): void {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.settings.open();
  }

  open(character: CharacterId): void {
    const card = STAFF.find((c) => c.characterId === character);
    if (!card) return;
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.confirmation.classList.add("hidden");
    this.wrap.classList.remove("hidden");
    this.cardHost.replaceChildren(renderIdCard(card, { badge: "you" }));
    this.root.classList.remove("hidden");
    this.wrap.querySelector<HTMLButtonElement>(".card-close")?.focus({ preventScroll: true });
  }

  close(): void {
    if (this.settings.isOpen) this.settings.close();
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.callbacks.onClose();
    this.previousFocus?.focus({ preventScroll: true });
  }

  private get confirmingExit(): boolean {
    return !this.confirmation.classList.contains("hidden");
  }

  private cancelExit(): void {
    this.confirmation.classList.add("hidden");
    this.wrap.classList.remove("hidden");
    this.exitButton.focus({ preventScroll: true });
  }

  get isOpen(): boolean {
    return !this.root.classList.contains("hidden");
  }
}
