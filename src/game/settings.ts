// Player settings (title screen → Settings), saved on this device.

const STORAGE_KEY = "eczema-care-hero-settings-v1";

interface Settings {
  soundOn: boolean;
  /**
   * Prayer-time announcements and the Surau mark on the map. The player's own choice (doctor
   * picker or Settings), never inferred from the chosen character. The Surau itself is always
   * open to everyone.
   */
  prayerReminders: boolean;
  /** Interface language ("en" | "ms"). */
  language: string;
}

function load(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return { soundOn: s.soundOn !== false, prayerReminders: s.prayerReminders !== false, language: s.language === "ms" ? "ms" : "en" };
  } catch {
    return { soundOn: true, prayerReminders: true, language: "en" };
  }
}

const settings = load();

export function soundOn(): boolean {
  return settings.soundOn;
}

export function setSoundOn(on: boolean): void {
  settings.soundOn = on;
  save();
}

export function prayerReminders(): boolean {
  return settings.prayerReminders;
}

export function setPrayerReminders(on: boolean): void {
  settings.prayerReminders = on;
  save();
}

export function language(): string {
  return settings.language;
}

export function setLanguage(id: string): void {
  settings.language = id;
  save();
}

function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // storage unavailable: the choice lasts for this session
  }
}

/** Wipes every saved part of the game (progress, case, clinic, events, trays, settings). */
export function resetAllProgress(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("eczema-care-hero"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // storage unavailable: nothing to wipe
  }
}
