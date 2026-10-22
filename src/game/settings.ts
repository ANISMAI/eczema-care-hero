// Player settings (title screen → Settings), saved on this device.

const STORAGE_KEY = "eczema-care-hero-settings-v1";

export type AudioBus = "ambience" | "effects" | "music";

interface Settings {
  soundOn: boolean;
  ambience: boolean;
  effects: boolean;
  music: boolean;
  /**
   * Prayer-time announcements and the Surau mark on the map. The player's own choice (doctor
   * picker or Settings), never inferred from the chosen character. The Surau itself is always
   * open to everyone.
   */
  prayerReminders: boolean;
  /** Interface language ("en" | "ms"). */
  language: string;
}

/** Old devices with Sound disabled stay quiet; new switches then persist independently. */
export function migrateSettings(value: unknown): Settings {
  const s = value && typeof value === "object" ? value as Partial<Settings> : {};
  const legacy = s.soundOn !== false;
  const effects = typeof s.effects === "boolean" ? s.effects : legacy;
  return {
    soundOn: effects,
    ambience: typeof s.ambience === "boolean" ? s.ambience : legacy,
    effects,
    music: typeof s.music === "boolean" ? s.music : legacy,
    prayerReminders: s.prayerReminders !== false,
    language: s.language === "ms" ? "ms" : "en",
  };
}

function load(): Settings {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return migrateSettings(s);
  } catch {
    return migrateSettings(null);
  }
}

const settings = load();
const audioListeners = new Set<() => void>();

export function audioOn(bus: AudioBus): boolean {
  return settings[bus];
}

export function setAudioOn(bus: AudioBus, on: boolean): void {
  settings[bus] = on;
  settings.soundOn = settings.effects;
  save();
  audioListeners.forEach((fn) => fn());
}

export function onAudioSettings(fn: () => void): () => void {
  audioListeners.add(fn);
  return () => { audioListeners.delete(fn); };
}

export function soundOn(): boolean {
  return settings.effects;
}

export function setSoundOn(on: boolean): void {
  setAudioOn("effects", on);
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
