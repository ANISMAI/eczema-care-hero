declare global {
  interface Window {
    __OCZE_EMBED?: boolean;
  }
}

function query(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search);
}

/** Whether the game is running inside the Ocze+ host app. */
export function isEmbedded(): boolean {
  return typeof window !== "undefined" && (window.__OCZE_EMBED === true || query()?.get("embed") === "1");
}

/** Language supplied by the host. Standalone play continues to use saved game settings. */
export function hostLanguage(): "en" | "ms" | null {
  if (!isEmbedded()) return null;
  const language = query()?.get("lang");
  return language === "ms" || language === "en" ? language : null;
}

/** Ask the host app to close the embedded game. */
export function exitToHost(): boolean {
  if (!isEmbedded()) return false;
  window.parent.postMessage({ type: "care-hero:exit" }, "*");
  return true;
}
