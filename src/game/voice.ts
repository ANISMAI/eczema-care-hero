import { soundOn } from "./settings";
import { lang, type Lang } from "./i18n";

// Spoken clinic announcements with the device's own text-to-speech (Web Speech API), so no audio
// files are needed: "Nombor, kosong, kosong, satu." The number is said
// digit by digit, like a real clinic's queue system, in the game's language. Follows the Sound
// setting; does nothing where speech isn't available.

const DIGITS: Record<Lang, string[]> = {
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
  ms: ["kosong", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "lapan", "sembilan"],
};

/** Just the number, short and quick (the banner says where to go). */
const CALL: Record<Lang, (digits: string) => string> = {
  en: (d) => `Number, ${d}.`,
  ms: (d) => `Nombor, ${d}.`,
};

/** Speech language per game language, best first (Indonesian reads Malay text well too). */
const VOICE_LANGS: Record<Lang, string[]> = {
  en: ["en-GB", "en-AU", "en-US", "en"],
  ms: ["ms-MY", "ms", "id-ID", "id"],
};

function speech(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

/** "001" → "zero, zero, one" / "kosong, kosong, satu". */
export function spokenDigits(ticket: string, language: Lang = lang()): string {
  return [...ticket].map((c) => DIGITS[language][Number(c)] ?? c).join(", ");
}

/** The best installed voice for a language, or null if none fits. */
function pickVoice(language: Lang): SpeechSynthesisVoice | null {
  const voices = speech()?.getVoices() ?? [];
  for (const want of VOICE_LANGS[language]) {
    const v = voices.find((x) => x.lang.toLowerCase().replace("_", "-").startsWith(want.toLowerCase()));
    if (v) return v;
  }
  return null;
}

function say(text: string, voice: SpeechSynthesisVoice | null, fallbackLang: string): void {
  const s = speech();
  if (!s) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = voice?.lang ?? fallbackLang;
  if (voice) u.voice = voice;
  u.rate = 0.9;
  u.pitch = 1;
  s.cancel(); // never queue up behind an older call
  s.speak(u);
}

/**
 * Calls a queue number out: "Number, zero, zero, one." In Bahasa
 * Melayu mode, if the device has no Malay (or Indonesian) voice the English call is used instead,
 * so the number is never read out in a foreign accent that is hard to follow.
 */
export function announceTicket(ticket: string): void {
  if (!soundOn() || !speech()) return;
  let language = lang();
  let voice = pickVoice(language);
  if (!voice && language === "ms") {
    language = "en";
    voice = pickVoice("en");
  }
  // straight away, together with the chime (speech engines take a moment to start anyway); also
  // keeps it inside the tap that called the patient, which some phones require for speech
  say(CALL[language](spokenDigits(ticket, language)), voice, VOICE_LANGS[language][0]);
}

/**
 * Some browsers (iOS Safari) only let a page speak after speech was started from a tap. On the
 * first tap anywhere a silent, empty utterance unlocks it, and the voice list starts loading.
 */
export function prepareVoice(): void {
  const s = speech();
  if (!s) return;
  s.getVoices();
  const unlock = () => {
    window.removeEventListener("pointerdown", unlock);
    try {
      const u = new SpeechSynthesisUtterance("");
      u.volume = 0;
      s.speak(u);
    } catch {
      // speech unavailable
    }
  };
  window.addEventListener("pointerdown", unlock);
}
