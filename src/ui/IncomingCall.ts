import { el } from "./case/Overlay";
import { soundOn } from "../game/settings";
import { t } from "../game/i18n";

// Morning phone call (systems/MorningRoutine.ts): a phone slides up with the caller ringing.
// Accept: the call connects and the caller's lines play one by one, then End call.
// Decline: the phone goes away at once (the caller sends a text instead; the routine says so).

export interface Caller {
  name: string;
  role: string;
  portrait: string;
}

export type CallResult = "accepted" | "declined";

const HANDSET =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>';

/** Two short trills, repeated by the caller while the phone rings. */
function trill(ctx: AudioContext): void {
  const now = ctx.currentTime;
  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = i ? 1180 : 940;
    const t0 = now + i * 0.32;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
    gain.gain.setValueAtTime(0.09, t0 + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.3);
  }
}

export default class IncomingCall {
  private parent: HTMLElement;

  constructor(parent: HTMLElement) {
    this.parent = parent;
  }

  /** Rings until answered. If accepted, `lines` play one by one before the promise resolves. */
  ring(caller: Caller, lines: string[]): Promise<CallResult> {
    const root = el("div", "call-screen");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", t("call.incoming", { name: caller.name }));
    const phone = el("div", "call-phone");
    const face = el("div", "call-face");
    for (let i = 0; i < 3; i++) face.append(el("span", "call-ring"));
    const img = el("img");
    img.src = caller.portrait;
    img.alt = "";
    face.append(img);
    const status = el("span", "call-status", t("call.ringing"));
    const speech = el("div", "call-speech hidden");
    const actions = el("div", "call-actions");
    phone.append(el("span", "call-notch"), face, el("strong", "call-name", caller.name), el("span", "call-role", caller.role), status, speech, actions);
    root.append(phone);
    this.parent.append(root);
    requestAnimationFrame(() => root.classList.add("in"));

    let audio: AudioContext | null = null;
    let ringTimer = 0;
    if (soundOn()) {
      try {
        audio = new AudioContext();
        const ctx = audio;
        trill(ctx);
        ringTimer = window.setInterval(() => trill(ctx), 1800);
      } catch {
        audio = null; // no sound: the rings on screen are enough
      }
    }
    const stopRinging = () => {
      window.clearInterval(ringTimer);
      if (audio) void audio.close();
      audio = null;
      root.classList.add("connected");
    };
    const hangUp = (result: CallResult, resolve: (r: CallResult) => void) => {
      stopRinging();
      root.classList.add("out");
      window.setTimeout(() => {
        root.remove();
        resolve(result);
      }, 350);
    };

    return new Promise((resolve) => {
      const decline = el("button", "call-btn decline");
      decline.innerHTML = '<span aria-hidden="true">✕</span>';
      decline.setAttribute("aria-label", t("call.decline"));
      decline.append(el("small", "", t("call.decline")));
      decline.addEventListener("click", () => hangUp("declined", resolve));

      const accept = el("button", "call-btn accept");
      accept.innerHTML = HANDSET;
      accept.setAttribute("aria-label", t("call.accept"));
      accept.append(el("small", "", t("call.accept")));
      accept.addEventListener("click", () => {
        stopRinging();
        const started = Date.now();
        const clock = window.setInterval(() => {
          const s = Math.floor((Date.now() - started) / 1000);
          status.textContent = `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
        }, 250);
        status.textContent = "00:00";
        speech.classList.remove("hidden");
        let i = 0;
        const next = el("button", "primary-btn wide call-next");
        const show = () => {
          speech.textContent = lines[i] ?? "";
          const last = i >= lines.length - 1;
          next.classList.toggle("end", last);
          next.textContent = last ? `📞  ${t("call.end")}` : t("menu.next");
        };
        next.addEventListener("click", () => {
          if (++i < lines.length) return show();
          window.clearInterval(clock);
          hangUp("accepted", resolve);
        });
        actions.replaceChildren(next);
        show();
        next.focus({ preventScroll: true });
      });

      actions.append(decline, accept);
      accept.focus({ preventScroll: true });
    });
  }
}
