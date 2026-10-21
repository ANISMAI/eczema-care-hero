import Overlay, { el, feedback } from "../case/Overlay";
import type { EventOutcome, EventPanel, EventRewards } from "../../events/types";

interface Item {
  id: string;
  icon: string;
  name: string;
  detail: string;
  /** The item on the approved card. */
  approved?: boolean;
  /** Why a non-matching item is wrong (shown kindly). */
  why?: string;
}

interface Scenario {
  patient: string;
  card: { item: string; note: string };
  items: Item[];
  checks: string[];
}

// Fictional patients and non-prescription care products only; no doses (brief section 10).
const SCENARIOS: Scenario[] = [
  {
    patient: "Tok Wan Ismail",
    card: { item: "SoftSkin Moisturising Cream", note: "Fragrance-free" },
    items: [
      { id: "rose", icon: "🌸", name: "SoftSkin Rose Lotion", detail: "Scented", why: "This one is scented. The card says fragrance-free." },
      { id: "cream", icon: "🧴", name: "SoftSkin Moisturising Cream", detail: "Fragrance-free", approved: true },
      { id: "scrub", icon: "🧽", name: "SoftSkin Exfoliating Scrub", detail: "With grains", why: "A scrub isn't on the card." },
    ],
    checks: ["Name: Tok Wan Ismail", "Item matches the card", "Label says fragrance-free"],
  },
  {
    patient: "Puan Aisyah",
    card: { item: "CalmWash Gentle Cleanser", note: "Soap-free" },
    items: [
      { id: "foam", icon: "🫧", name: "CalmWash Foaming Soap", detail: "Lavender scent", why: "That's a scented soap. The card says soap-free cleanser." },
      { id: "cream", icon: "🧴", name: "SoftSkin Moisturising Cream", detail: "Fragrance-free", why: "A good product, but it isn't the one on this card." },
      { id: "wash", icon: "🧼", name: "CalmWash Gentle Cleanser", detail: "Soap-free", approved: true },
    ],
    checks: ["Name: Puan Aisyah", "Item matches the card", "Label says soap-free"],
  },
  {
    patient: "Mei Ling",
    card: { item: "SunKind Sunscreen", note: "Fragrance-free" },
    items: [
      { id: "sun", icon: "🌞", name: "SunKind Sunscreen", detail: "Fragrance-free", approved: true },
      { id: "tint", icon: "🌺", name: "SunKind Tinted Sunscreen", detail: "Floral scent", why: "Same brand, but scented. Check the small print!" },
      { id: "gel", icon: "💧", name: "SunKind After-Sun Gel", detail: "Cooling gel", why: "That's an after-sun gel, not the sunscreen on the card." },
    ],
    checks: ["Name: Mei Ling", "Item matches the card", "Label says fragrance-free"],
  },
];

const GRACE = "assets/portraits/grace.webp";

/**
 * Pharmacy event, "Which item?": Grace isn't sure which product matches an approved card.
 * Pick the matching item, confirm the label checks. A wrong pick only gets a hint.
 */
export default class PharmacyCheckPanel implements EventPanel {
  private overlay: Overlay;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "event-panel");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  close(): void { this.overlay.close(); }

  open(seed: number, rewards: EventRewards, done: (o: EventOutcome) => void): void {
    const sc = SCENARIOS[seed % SCENARIOS.length];
    let outcome: EventOutcome = "later";
    let picked = false;
    const checked = new Set<number>();
    const wrong = new Set<string>();
    let note: HTMLElement | null = null;

    this.overlay.setHeader({ title: "Pharmacy check", avatar: GRACE, subtitle: "Grace · Pharmacy" });

    const later = el("button", "secondary-btn", "Later");
    later.addEventListener("click", () => this.overlay.close());
    const skip = el("button", "link-btn", "Skip this request");
    skip.addEventListener("click", () => {
      outcome = "dismissed";
      this.overlay.close();
    });
    const confirm = el("button", "primary-btn", "Confirm for Grace");
    confirm.addEventListener("click", () => {
      outcome = "resolved";
      const ok = el("button", "primary-btn wide", "Done");
      ok.addEventListener("click", () => this.overlay.close());
      this.overlay.body.replaceChildren(
        el("div", "case-speech", `Thank you! I'll hand it to ${sc.patient} now. 💊`),
        feedback(`Item checked · +${rewards.coins} 🪙  +${rewards.xp} XP`, "good")
      );
      this.overlay.footer.replaceChildren(ok);
    });
    const actions = el("div", "event-actions");
    actions.append(later, confirm);

    const render = () => {
      const card = el("div", "rx-card");
      card.append(el("span", "rx-tag", "✔ Approved care card"), el("strong", "", sc.card.item), el("span", "", sc.card.note), el("span", "rx-for", `For: ${sc.patient}`));
      const parts: HTMLElement[] = [card];

      if (!picked) {
        parts.push(el("div", "case-speech", "I have a few similar products here. Which one matches the card?"));
        const grid = el("div", "icon-cards wide item-grid");
        for (const item of sc.items) {
          const b = el("button", "icon-card");
          const t = el("span", "item-text");
          t.append(el("strong", "", item.name), el("span", "", item.detail));
          b.append(el("span", "icon-card-icon", item.icon), t);
          b.classList.toggle("wrong", wrong.has(item.id));
          b.disabled = wrong.has(item.id);
          b.addEventListener("click", () => {
            if (item.approved) {
              picked = true;
              note = feedback("That's the one on the card.", "good");
            } else {
              wrong.add(item.id);
              note = feedback(item.why ?? "That one doesn't match the card.", "bad");
            }
            render();
          });
          grid.append(b);
        }
        parts.push(grid);
      } else {
        const chosen = sc.items.find((i) => i.approved)!;
        const label = el("div", "item-label");
        const lt = el("div", "item-text");
        lt.append(el("strong", "", chosen.name), el("span", "", `${chosen.detail} · ${sc.patient}`));
        label.append(el("span", "icon-card-icon", chosen.icon), lt);
        parts.push(el("div", "case-speech", "Now check the label against the card. Tap each line."), label);
        const list = el("div", "check-list");
        sc.checks.forEach((text, i) => {
          const row = el("button", "check-row");
          row.classList.toggle("on", checked.has(i));
          row.append(el("span", "check-box", "✓"), el("span", "", text));
          row.addEventListener("click", () => {
            checked.add(i);
            note = null;
            render();
          });
          list.append(row);
        });
        parts.push(list);
      }
      if (note) parts.push(note);
      confirm.disabled = !(picked && checked.size === sc.checks.length);
      this.overlay.body.replaceChildren(...parts);
    };

    render();
    this.overlay.footer.replaceChildren(actions, skip);
    this.overlay.open(() => done(outcome));
  }
}
