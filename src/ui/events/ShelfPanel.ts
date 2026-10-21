import Overlay, { el, feedback } from "../case/Overlay";
import type { EventOutcome, EventPanel, EventRewards } from "../../events/types";

interface Supply {
  id: string;
  icon: string;
  label: string;
}

/** One shelf event: which shelf, who asks, how many slots are empty and how many decoy boxes. */
export interface ShelfConfig {
  title: string;
  avatar: string;
  subtitle: string;
  /** Six labelled slots, in shelf order. */
  supplies: Supply[];
  /** Empty slots to fill. */
  missing: number;
  /** Extra boxes that don't belong in any empty slot. */
  decoys: number;
  speech(labels: string[]): string;
  doneSpeech: string;
  doneLabel: string;
  confirmLabel: string;
}

/** Storage low stock: one empty slot, two decoy boxes. */
export const RESTOCK: ShelfConfig = {
  title: "Low stock",
  avatar: "assets/portraits/ravi.webp",
  subtitle: "Encik Ravi · Storage",
  supplies: [
    { id: "gloves", icon: "🧤", label: "Gloves" },
    { id: "plasters", icon: "🩹", label: "Plasters" },
    { id: "gauze", icon: "🧻", label: "Gauze" },
    { id: "cream", icon: "🧴", label: "Cream tubs" },
    { id: "wash", icon: "🧼", label: "Gentle wash" },
    { id: "masks", icon: "😷", label: "Masks" },
  ],
  missing: 1,
  decoys: 2,
  speech: ([l]) => `We've run out on one shelf. Find the box labelled "${l}" and put it in the empty slot.`,
  doneSpeech: "Shelf's full again. Thanks for the help! 📦",
  doneLabel: "Restocked",
  confirmLabel: "Confirm restock",
};

/** Pharmacy shelf mix-up: three items fell out of place; put each back by its label. */
export const PHARMACY_SORT: ShelfConfig = {
  title: "Shelf mix-up",
  avatar: "assets/portraits/grace.webp",
  subtitle: "Grace · Pharmacy",
  supplies: [
    { id: "cream", icon: "🧴", label: "Moisturising cream" },
    { id: "wash", icon: "🧼", label: "Gentle cleanser" },
    { id: "sun", icon: "🌞", label: "Sunscreen" },
    { id: "plasters", icon: "🩹", label: "Plasters" },
    { id: "pads", icon: "🧻", label: "Cotton pads" },
    { id: "gel", icon: "🫧", label: "Hand sanitiser" },
  ],
  missing: 3,
  decoys: 0,
  speech: () => "A delivery got mixed up and these ended up on the counter. Can you put each one back where its label says?",
  doneSpeech: "Everything's back in its place. Now I can find things quickly! 💊",
  doneLabel: "Shelf sorted",
  confirmLabel: "Shelf looks right",
};

const DRAG_START = 6; // px of movement before a press becomes a drag

/**
 * Shelf events (Storage restock, Pharmacy mix-up): some slots are empty. Drag each box onto the
 * slot with the matching label (or tap the box, then tap the slot), then confirm. A box on the
 * wrong slot bounces back with a hint; nothing is lost.
 */
export default class ShelfPanel implements EventPanel {
  private overlay: Overlay;
  private cfg: ShelfConfig;

  constructor(parent: HTMLElement, cfg: ShelfConfig) {
    this.overlay = new Overlay(parent, "event-panel");
    this.cfg = cfg;
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  close(): void { this.overlay.close(); }

  open(seed: number, rewards: EventRewards, done: (o: EventOutcome) => void): void {
    const c = this.cfg;
    const all = c.supplies;
    // which slots are empty (distinct, from the seed)
    const missing: number[] = [];
    for (let k = 0; missing.length < c.missing; k++) {
      const i = (seed + k * 5) % all.length;
      if (!missing.includes(i)) missing.push(i);
    }
    const others = all.filter((_, i) => !missing.includes(i));
    const decoys = Array.from({ length: c.decoys }, (_, k) => others[((seed >> 2) + k * 2) % others.length]);
    const boxes = [...missing.map((i) => all[i]), ...decoys];
    const turn = (seed >> 4) % boxes.length;
    const tray = [...boxes.slice(turn), ...boxes.slice(0, turn)];

    let outcome: EventOutcome = "later";
    let selected: string | null = null;
    const filled = new Set<number>();

    this.overlay.setHeader({ title: c.title, avatar: c.avatar, subtitle: c.subtitle });
    const speech = el("div", "case-speech", c.speech(missing.map((i) => all[i].label)));

    const shelf = el("div", "shelf");
    const slotEls = new Map<number, HTMLElement>();
    const boxEls = new Map<string, HTMLButtonElement>();
    const note = el("div");

    all.forEach((s, i) => {
      const empty = missing.includes(i);
      const slot = el("div", empty ? "shelf-slot empty" : "shelf-slot");
      slot.dataset.slot = String(i);
      slot.append(el("span", "shelf-item", empty ? "" : s.icon), el("span", "shelf-label", s.label));
      if (empty) {
        slot.setAttribute("role", "button");
        slot.tabIndex = 0;
        slot.setAttribute("aria-label", `Empty slot: ${s.label}`);
        slot.addEventListener("click", () => selected && place(selected, i));
        slot.addEventListener("keydown", (e) => {
          if ((e.key === "Enter" || e.key === " ") && selected) place(selected, i);
        });
        slotEls.set(i, slot);
      }
      shelf.append(slot);
    });

    const select = (id: string | null) => {
      selected = id;
      boxEls.forEach((b, bid) => b.classList.toggle("selected", bid === id));
      slotEls.forEach((s, i) => s.classList.toggle("ready", !!id && !filled.has(i)));
    };

    const place = (id: string, slot: number) => {
      if (filled.has(slot)) return;
      const box = all.find((s) => s.id === id)!;
      const b = boxEls.get(id)!;
      if (all[slot].id !== id) {
        b.classList.remove("shake");
        void b.offsetWidth;
        b.classList.add("shake");
        note.replaceChildren(feedback(`That box says "${box.label}". The slot needs "${all[slot].label}".`, "bad"));
        return;
      }
      filled.add(slot);
      b.classList.add("gone");
      const s = slotEls.get(slot)!;
      s.classList.add("filled");
      s.querySelector(".shelf-item")!.textContent = box.icon;
      select(null);
      const left = c.missing - filled.size;
      note.replaceChildren(feedback(left ? `Labels match! ${left} to go.` : "Labels match. All done!", "good"));
      confirm.disabled = left > 0;
    };

    const trayEl = el("div", "box-tray");
    for (const s of tray) {
      const b = el("button", "supply-box");
      b.append(el("span", "supply-icon", s.icon), el("span", "supply-label", s.label));
      b.setAttribute("aria-label", `Box: ${s.label}`);
      boxEls.set(s.id, b);
      trayEl.append(b);

      let start: { x: number; y: number } | null = null;
      let ghost: HTMLElement | null = null;
      const slotAt = (x: number, y: number) => {
        const hit = document.elementFromPoint(x, y)?.closest<HTMLElement>(".shelf-slot.empty:not(.filled)");
        return hit ? Number(hit.dataset.slot) : null;
      };
      b.addEventListener("pointerdown", (e) => {
        if (b.classList.contains("gone")) return;
        start = { x: e.clientX, y: e.clientY };
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointermove", (e) => {
        if (!start) return;
        if (!ghost && Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_START) {
          ghost = b.cloneNode(true) as HTMLElement;
          ghost.classList.add("drag-ghost");
          document.body.append(ghost);
          b.classList.add("lifted");
        }
        if (ghost) {
          ghost.style.left = `${e.clientX}px`;
          ghost.style.top = `${e.clientY}px`;
          const over = slotAt(e.clientX, e.clientY);
          slotEls.forEach((el, i) => el.classList.toggle("over", i === over));
        }
      });
      const end = (e: PointerEvent) => {
        if (!start) return;
        start = null;
        b.classList.remove("lifted");
        slotEls.forEach((el) => el.classList.remove("over"));
        if (ghost) {
          ghost.remove();
          ghost = null;
          const over = slotAt(e.clientX, e.clientY);
          if (over !== null && e.type === "pointerup") place(s.id, over);
          return;
        }
        if (e.type === "pointerup") select(s.id); // a tap: then tap the slot
      };
      b.addEventListener("pointerup", end);
      b.addEventListener("pointercancel", end);
      // keyboard: Enter / Space selects the box and moves focus to the first open slot
      b.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        select(s.id);
        [...slotEls].find(([i]) => !filled.has(i))?.[1].focus();
      });
    }

    const later = el("button", "secondary-btn", "Later");
    later.addEventListener("click", () => this.overlay.close());
    const skip = el("button", "link-btn", "Skip this request");
    skip.addEventListener("click", () => {
      outcome = "dismissed";
      this.overlay.close();
    });
    const confirm = el("button", "primary-btn", c.confirmLabel);
    confirm.disabled = true;
    confirm.addEventListener("click", () => {
      outcome = "resolved";
      const ok = el("button", "primary-btn wide", "Done");
      ok.addEventListener("click", () => this.overlay.close());
      this.overlay.body.replaceChildren(el("div", "case-speech", c.doneSpeech), feedback(`${c.doneLabel} · +${rewards.coins} 🪙  +${rewards.xp} XP`, "good"));
      this.overlay.footer.replaceChildren(ok);
    });

    const actions = el("div", "event-actions");
    actions.append(later, confirm);
    const caption = el("div", "tray-caption", c.missing > 1 ? "Drag each box to its empty slot 👆" : "Drag a box to the empty slot 👆");
    this.overlay.body.replaceChildren(speech, shelf, caption, trayEl, note);
    this.overlay.footer.replaceChildren(actions, skip);
    this.overlay.open(() => {
      // A lifecycle close can happen before pointerup; leave no drag image over the summary.
      document.querySelectorAll(".drag-ghost").forEach(ghost => ghost.remove());
      done(outcome);
    });
  }
}
