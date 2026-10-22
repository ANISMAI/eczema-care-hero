import { lang, type Lang } from "../../game/i18n";

// Phase 5 content strings (brief section 8): every new line, choice, feedback and label has an
// English and a Bahasa Melayu version under a stable structured key, e.g.
// "scenario.f02.turn.onset.choice.redirect.text". Content files declare text with L(key, en, ms);
// the key table is kept here so tests can audit it and a missing translation is reported
// (console warning + missingTranslations()) and shown visibly in English instead of hidden.

export type Bilingual = Record<Lang, string>;

const TABLE = new Map<string, Bilingual>();
const missing = new Set<string>();

/** Registers a bilingual string under `key` and returns it in the current language. */
export function L(key: string, en: string, ms: string): string {
  if (TABLE.has(key)) console.warn(`[phase5] duplicate text key: ${key}`);
  TABLE.set(key, { en, ms });
  return tr(key);
}

/** The text for `key` in the current language; `{var}` placeholders filled from `vars`. */
export function tr(key: string, vars: Record<string, string | number> = {}): string {
  const entry = TABLE.get(key);
  const want = lang();
  let text = entry?.[want]?.trim() ? entry[want] : "";
  if (!text) {
    if (!missing.has(key)) {
      missing.add(key);
      console.warn(`[phase5] missing ${want} text for "${key}"`);
    }
    // visible, safe fallback: the English line, or the key itself if there is none
    text = entry?.en?.trim() ? entry.en : `⟦${key}⟧`;
  }
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** Every registered key (for tests and audits). */
export function textKeys(): string[] {
  return [...TABLE.keys()];
}

/** The raw bilingual entry for a key (for tests and audits). */
export function textEntry(key: string): Bilingual | undefined {
  return TABLE.get(key);
}

/** Keys whose translation was missing when they were shown (reported, not hidden). */
export function missingTranslations(): string[] {
  return [...missing];
}
