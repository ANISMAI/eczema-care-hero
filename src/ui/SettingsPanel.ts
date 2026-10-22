import { LANGUAGES, lang, t, type Lang } from "../game/i18n";
import { audioOn, prayerReminders, resetAllProgress, setAudioOn, setPrayerReminders } from "../game/settings";
import { el } from "./IdCard";
import "./settings.css";

// The title and in-game profile share controls and saved values. Only the title exposes reset;
// closing in-game settings returns to the profile while the scene remains paused.

interface SettingsOptions {
  allowReset?: boolean;
  onClose(): void;
  onLanguageChange(language: Lang): void;
}

export default class SettingsPanel {
  readonly root: HTMLDivElement;
  private previousFocus: HTMLElement | null = null;
  private options: SettingsOptions;

  constructor(parent: HTMLElement, options: SettingsOptions) {
    this.options = options;
    this.root = el("div", "modal-overlay title-settings-panel settings-panel hidden");
    const card = el("div", "ts-card");
    card.setAttribute("role", "dialog");
    card.setAttribute("aria-modal", "true");
    card.setAttribute("aria-label", t("menu.settings"));
    card.innerHTML = `
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
      <label class="ts-row ts-language-row">
        <span><strong>${t("menu.language")}</strong><small>${t("settings.languageHint")}</small></span>
        <select class="ts-language">${LANGUAGES.map((l) => `<option value="${l.id}">${l.name}</option>`).join("")}</select>
      </label>
      ${options.allowReset ? `
      <div class="ts-row ts-reset-row">
        <span><strong>${t("settings.reset")}</strong><small>${t("settings.resetHint")}</small></span>
        <button type="button" class="ts-reset">${t("settings.resetBtn")}</button>
      </div>` : ""}
      <button type="button" class="primary-btn wide ts-close">${t(options.allowReset ? "menu.done" : "menu.back")}</button>`;
    for (const bus of ["ambience", "effects", "music"] as const) {
      const toggle = card.querySelector<HTMLInputElement>(`.ts-${bus}`)!;
      toggle.addEventListener("change", () => setAudioOn(bus, toggle.checked));
    }
    const prayer = card.querySelector<HTMLInputElement>(".ts-prayer")!;
    prayer.addEventListener("change", () => setPrayerReminders(prayer.checked));
    const language = card.querySelector<HTMLSelectElement>(".ts-language")!;
    language.addEventListener("change", () => {
      if (language.value !== lang()) options.onLanguageChange(language.value as Lang);
    });
    const reset = card.querySelector<HTMLButtonElement>(".ts-reset");
    reset?.addEventListener("click", () => {
      if (reset.dataset.confirm) {
        resetAllProgress();
        window.location.reload();
        return;
      }
      reset.dataset.confirm = "1";
      reset.textContent = t("settings.resetConfirm");
      reset.classList.add("confirm");
    });
    card.querySelector(".ts-close")!.addEventListener("click", () => this.close());
    this.root.append(card);
    this.root.addEventListener("click", (e) => { if (e.target === this.root) this.close(); });
    this.root.addEventListener("keydown", (e) => {
      e.stopPropagation(); // leave Space and arrow keys to the controls, not Phaser
      if (e.key === "Escape") { e.preventDefault(); this.close(); }
      if (e.key === "Tab") {
        const controls = Array.from(card.querySelectorAll<HTMLElement>("button, input, select")).filter((c) => !c.hasAttribute("disabled"));
        const index = controls.indexOf(document.activeElement as HTMLElement);
        const next = (index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
        e.preventDefault();
        controls[next]?.focus();
      }
    });
    parent.append(this.root);
  }

  open(focusLanguage = false): void {
    this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    for (const bus of ["ambience", "effects", "music"] as const) this.root.querySelector<HTMLInputElement>(`.ts-${bus}`)!.checked = audioOn(bus);
    this.root.querySelector<HTMLInputElement>(".ts-prayer")!.checked = prayerReminders();
    this.root.querySelector<HTMLSelectElement>(".ts-language")!.value = lang();
    const reset = this.root.querySelector<HTMLButtonElement>(".ts-reset");
    if (reset) {
      delete reset.dataset.confirm;
      reset.textContent = t("settings.resetBtn");
      reset.classList.remove("confirm");
    }
    this.root.classList.remove("hidden");
    this.root.querySelector<HTMLElement>(focusLanguage ? ".ts-language" : ".ts-ambience")!.focus();
  }

  close(): void {
    if (!this.isOpen) return;
    this.root.classList.add("hidden");
    this.options.onClose();
    this.previousFocus?.focus({ preventScroll: true });
  }

  get isOpen(): boolean {
    return this.root.isConnected && !this.root.classList.contains("hidden");
  }
}
