import Overlay, { el, feedback } from "../case/Overlay";
import type { EventOutcome, EventPanel, EventRewards } from "../../events/types";
import "./pharmacy-label.css";

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

/** Printed pharmacy label; the same fields are compared and checked in both steps. */
function productLabel(patient: string, name: string, detail: string, checks?: {
  checked: Set<number>;
  descriptions: string[];
  onCheck(index: number): void;
}): HTMLDivElement {
  const label = el("div", "pharmacy-label");
  const header = el("div", "pharmacy-label-header");
  header.append(el("strong", "pharmacy-clinic", "ECZEMA CARE CLINIC"), el("span", "pharmacy-department", "PHARMACY · CARE PRODUCT"));
  const fields = el("div", "pharmacy-label-fields");
  const values = [["Name / Nama", patient], ["Product / Produk", name], ["Label note / Ciri", detail]];
  values.forEach(([title, value], i) => {
    const contents = el("span", "pharmacy-field-text");
    contents.append(el("span", "pharmacy-field-title", title), el("strong", "pharmacy-field-value", value));
    if (checks) {
      const field = el("button", "pharmacy-label-field checkable");
      field.type = "button";
      field.dataset.labelCheck = String(i);
      field.classList.toggle("checked", checks.checked.has(i));
      field.setAttribute("aria-label", checks.descriptions[i]);
      field.setAttribute("aria-pressed", String(checks.checked.has(i)));
      const tick = el("span", "pharmacy-field-tick", checks.checked.has(i) ? "✓" : "");
      tick.setAttribute("aria-hidden", "true");
      field.append(contents, tick);
      field.addEventListener("click", () => checks.onCheck(i));
      fields.append(field);
    } else {
      const field = el("div", "pharmacy-label-field");
      field.append(contents);
      fields.append(field);
    }
  });
  label.append(header, fields);
  return label;
}

/**
 * Pharmacy event, "Which item?": Grace isn't sure which product matches an approved card.
 * Pick the matching item, confirm the label checks. A wrong pick only gets a hint.
 */
export default class PharmacyCheckPanel implements EventPanel {
  private overlay: Overlay;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "event-panel pharmacy-check");
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
    confirm.type = "button";
    confirm.addEventListener("click", () => {
      if (!picked || checked.size !== sc.checks.length) return;
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
      const reference = el("div", "pharmacy-reference");
      reference.append(el("div", "pharmacy-label-caption rx-tag", "✔ Approved care card"), productLabel(sc.patient, sc.card.item, sc.card.note));
      const parts: HTMLElement[] = [];

      if (!picked) {
        reference.classList.add("compact");
        parts.push(reference, el("div", "case-speech", "Which product label matches the approved care card?"));
        const grid = el("div", "pharmacy-label-options");
        grid.setAttribute("role", "group");
        grid.setAttribute("aria-label", "Product labels");
        for (const item of sc.items) {
          const b = el("button", "pharmacy-label-option");
          b.type = "button";
          b.dataset.item = item.id;
          b.setAttribute("aria-label", `${item.name}, ${item.detail}, for ${sc.patient}`);
          const caption = el("span", "pharmacy-option-caption");
          const illustration = el("span", "pharmacy-product-icon", item.icon);
          illustration.setAttribute("aria-hidden", "true");
          caption.append(illustration, el("span", "", `Product ${sc.items.indexOf(item) + 1}`));
          b.append(caption, productLabel(sc.patient, item.name, item.detail));
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
        const selected = el("div", "pharmacy-selected");
        const count = el("span", "pharmacy-check-count", `${checked.size} / ${sc.checks.length} checked`);
        count.setAttribute("role", "status");
        const caption = el("div", "pharmacy-label-caption");
        caption.append(el("strong", "", "Product label"), count);
        selected.append(caption, productLabel(sc.patient, chosen.name, chosen.detail, {
          checked,
          descriptions: sc.checks,
          onCheck: (i) => {
            checked.add(i);
            note = null;
            render();
            this.overlay.body.querySelector<HTMLButtonElement>(`[data-label-check="${i}"]`)?.focus({ preventScroll: true });
          },
        }));
        const comparison = el("div", "pharmacy-label-comparison");
        comparison.append(reference, selected);
        parts.push(el("div", "case-speech", "Compare both labels. Tap the name, product and label note on the product label to check them."), comparison);
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
