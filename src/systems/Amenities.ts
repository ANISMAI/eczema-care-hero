import Fader from "../ui/Fader";
import type { InteractableDef, Point, RoomId } from "../data/rooms";
import { getRoomById } from "../data/rooms";

/** What the toilet and surau need from the scene. */
export interface AmenitiesHost {
  uiRoot: HTMLElement;
  /** The chosen doctor can pray at the Surau mat (otherwise the mat is just a quiet place). */
  canPray(): boolean;
  lock(): void;
  unlock(): void;
  toast(text: string): void;
  /** Hide / show the player avatar (e.g. inside a cubicle). */
  setPlayerVisible(visible: boolean): void;
  walkTo(p: Point): Promise<boolean>;
  /**
   * Shows the doctor sitting in prayer on the mat (feet point). Returns a controller, or null
   * if the pose sprite isn't available.
   */
  showPrayPose(at: Point): { setFrame(f: number): void; stop(): void } | null;
  /** Cubicle door animation: walk in (enter) or out. */
  playStall(enter: boolean): Promise<boolean>;
  /** Water running from the toilet sink tap. */
  playTap(ms: number): Promise<boolean>;
  /** Modal message (e.g. "wash your hands first"). */
  alert(title: string, text: string, icon: string): void;
}

/**
 * Toilet and surau: private, respectful moments shown with a soft fade, never scored
 * (brief section 05). After using the toilet the player must wash their hands before leaving.
 */
/** Doa for healing the sick (shown while the doctor prays). */
const DOA = {
  arabic:
    "اللَّهُمَّ رَبَّ النَّاسِ أَذْهِبِ الْبَأْسَ اشْفِهِ وَأَنْتَ الشَّافِي لَا شِفَاءَ إِلَّا شِفَاؤُكَ شِفَاءً لَا يُغَادِرُ سَقَمًا",
  meaning:
    "Wahai Allah, Tuhan sekalian alam. Hilangkanlah kesusahan. Sembuhkanlah pesakit ini, sesungguhnya Engkau Maha Menyembuhkan. Tiada kesembuhan melainkan kesembuhan dariMu. Kesembuhan sempurna yang tidak meninggalkan kesan.",
};

/** Card with the doa, shown for `ms`; resolves when it has gone. */
function doaCard(parent: HTMLElement, ms: number): Promise<void> {
  const card = document.createElement("div");
  card.className = "doa-card";
  card.setAttribute("role", "dialog");
  card.setAttribute("aria-label", "Doa");
  const ar = document.createElement("p");
  ar.className = "doa-arabic";
  ar.lang = "ar";
  ar.dir = "rtl";
  ar.textContent = DOA.arabic;
  const meaning = document.createElement("p");
  meaning.className = "doa-meaning";
  meaning.lang = "ms";
  meaning.textContent = `“${DOA.meaning}”`;
  card.append(ar, meaning);
  parent.appendChild(card);
  return new Promise((resolve) =>
    window.setTimeout(() => {
      card.classList.add("out");
      window.setTimeout(() => {
        card.remove();
        resolve();
      }, 300);
    }, ms)
  );
}

export default class Amenities {
  private host: AmenitiesHost;
  private fader: Fader;
  private busy = false;
  private needsWash = false;
  private lastRoom: RoomId | null = null;

  constructor(host: AmenitiesHost) {
    this.host = host;
    this.fader = new Fader(host.uiRoot);
  }

  /** Interact-button label override. */
  actionLabel(item: InteractableDef): string | null {
    if (item.id === "toilet-stall") return "🚻 Use toilet";
    if (item.id === "toilet-sink") return this.needsWash ? "🧼 Wash hands" : "Sink";
    if (item.id === "surau-mat") return this.host.canPray() ? "🤲 Pray" : null;
    return null;
  }

  /** Returns true if handled. */
  handle(item: InteractableDef): boolean {
    if (this.busy) return true;
    if (item.id === "toilet-stall") return void this.useToilet(), true;
    if (item.id === "toilet-sink" && this.needsWash) return void this.washHands(), true;
    if (item.id === "surau-mat" && this.host.canPray()) return void this.pray(item), true;
    return false;
  }

  /** Call every frame with the player's room: keeps them in the toilet until hands are washed. */
  update(room: RoomId | null): void {
    if (this.needsWash && this.lastRoom === "toilet" && room !== "toilet" && !this.busy) {
      void this.returnToToilet();
    }
    this.lastRoom = room;
  }

  private async returnToToilet(): Promise<void> {
    this.busy = true;
    this.host.lock();
    await this.host.walkTo(getRoomById("toilet").spawn);
    this.busy = false;
    this.host.alert(
      "Euuu! 🤢",
      "You need to wash your hands first! Germs from the toilet can spread to your patients and their sensitive skin. Use the sink before you leave.",
      "🧼"
    );
  }

  private async useToilet(): Promise<void> {
    this.busy = true;
    this.host.lock();
    if (!(await this.host.playStall(true))) {
      this.busy = false;
      this.host.unlock();
      return;
    }
    await this.fader.show("⏳", "One moment…", 2200, undefined, false, true);
    await this.host.playStall(false);
    this.needsWash = true;
    this.busy = false;
    this.host.unlock();
    this.host.toast("🧼  Please wash your hands at the sink");
  }

  private async washHands(): Promise<void> {
    this.busy = true;
    this.host.lock();
    // Walk to the sink before showing the washing effect.
    if (await this.host.playTap(2000)) this.needsWash = false;
    this.busy = false;
    this.host.unlock();
    if (!this.needsWash) this.host.toast("💧  Clean! Tip: pat dry, then moisturise");
  }

  private async pray(mat: InteractableDef): Promise<void> {
    this.busy = true;
    this.host.lock();
    if (!(await this.host.walkTo({ x: mat.x, y: mat.y + 40 }))) {
      this.busy = false;
      this.host.unlock();
      return;
    }
    const pose = this.host.showPrayPose({ x: mat.x, y: mat.y + 18 });
    if (pose) {
      // fully automatic: prayer (5 s), then the doa card while the doctor raises her hands (3 s)
      this.host.setPlayerVisible(false);
      pose.setFrame(1);
      await this.fader.show("", "🕌  Praying…", 5000, undefined, true);
      pose.setFrame(0);
      await doaCard(this.host.uiRoot, 3000);
      pose.stop();
      this.host.setPlayerVisible(true);
    } else {
      const done = this.fader.show("🤲", "Taking a moment to pray", 3400);
      window.setTimeout(() => this.fader.setText("🌿", "Feeling refreshed"), 2300);
      await done;
    }
    this.busy = false;
    this.host.unlock();
  }
}
