// In-game shift clock: 8:00 AM to 5:00 PM, 1 real minute = 30 game minutes (a shift lasts
// about 18 minutes of play). Pauses while panels are open. Saved so a refresh resumes the time.
// Prayer-time announcements are gentle reminders only: optional, never scored.

const STORAGE_KEY = "eczema-care-hero-clock-v1";
const SHIFT_START = 8 * 60;
const SHIFT_END = 17 * 60;
const GAME_MINUTES_PER_MS = 30 / 60000;

export interface PrayerTime {
  id: string;
  at: number; // minutes since midnight
  message: string;
}

export const PRAYER_TIMES: PrayerTime[] = [
  { id: "dhuha", at: 10 * 60, message: "🌤️  A good time for Dhuha" },
  { id: "zohor", at: 13 * 60 + 15, message: "☀️  It's time for Zohor" },
  { id: "asar", at: 16 * 60 + 30, message: "🌥️  It's time for Asar" },
];
/** How long after a prayer time the Surau is marked on the map (game minutes). */
const PRAYER_WINDOW = 60;

export interface ClockEvents {
  onPrayerTime(p: PrayerTime): void;
  onShiftOver(): void;
}

export default class GameClock {
  private minutes = SHIFT_START;
  private events: ClockEvents;
  private saveTimer = 0;

  constructor(events: ClockEvents) {
    this.events = events;
    try {
      const v = Number(localStorage.getItem(STORAGE_KEY));
      if (v >= SHIFT_START && v < SHIFT_END) this.minutes = v;
    } catch {
      // storage unavailable: start of shift
    }
  }

  /** Advance the clock; call every frame while the player is free to move. */
  tick(deltaMs: number): void {
    const before = this.minutes;
    this.minutes += deltaMs * GAME_MINUTES_PER_MS;
    for (const p of PRAYER_TIMES) if (before < p.at && this.minutes >= p.at) this.events.onPrayerTime(p);
    if (this.minutes >= SHIFT_END) {
      this.minutes = SHIFT_START;
      this.events.onShiftOver();
    }
    this.saveTimer += deltaMs;
    if (this.saveTimer > 2000) this.save();
  }

  save(): void {
    this.saveTimer = 0;
    try {
      localStorage.setItem(STORAGE_KEY, String(Math.floor(this.minutes)));
    } catch {
      // ignore
    }
  }

  /** "10:24 AM" */
  label(): string {
    const m = Math.floor(this.minutes);
    const h24 = Math.floor(m / 60);
    const h = ((h24 + 11) % 12) + 1;
    return `${h}:${String(m % 60).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
  }

  /** The prayer time currently "open" (within the window after it), if any. */
  currentPrayer(): PrayerTime | null {
    return PRAYER_TIMES.find((p) => this.minutes >= p.at && this.minutes < p.at + PRAYER_WINDOW) ?? null;
  }
}
