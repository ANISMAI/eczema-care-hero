import Overlay, { el, feedback } from "../case/Overlay";
import type { EventOutcome, EventPanel, EventRewards } from "../../events/types";

interface Record_ {
  name: string;
  appt: string;
  ic: string;
}

/** Fictional walk-ins: the form, and an existing record that is easy to mix up with it. */
const SCENARIOS: { form: Record_; decoy: Record_ }[] = [
  {
    form: { name: "Tan Mei Ling", appt: "10:30 AM", ic: "••• 4821" },
    decoy: { name: "Tan Mei Lin", appt: "11:30 AM", ic: "••• 4812" },
  },
  {
    form: { name: "Muhammad Hafiz bin Ali", appt: "2:00 PM", ic: "••• 7350" },
    decoy: { name: "Muhammad Hafiz bin Ali", appt: "2:00 PM", ic: "••• 7305" },
  },
  {
    form: { name: "Priya Devi", appt: "9:15 AM", ic: "••• 1196" },
    decoy: { name: "Priya Devi", appt: "3:15 PM", ic: "••• 1196" },
  },
];

const NURUL = "assets/portraits/nurul.webp";

function recordCard(r: Record_, cls: string): HTMLElement {
  const box = el("div", cls);
  box.append(
    el("strong", "", r.name),
    el("span", "", `🗓️ ${r.appt}`),
    el("span", "", `🪪 IC ${r.ic}`)
  );
  return box;
}

/**
 * Event 01, Reception registration error: compare the patient's form with two existing records
 * and pick the one that matches exactly. A wrong pick only gets a hint; nothing is lost.
 */
export default class RegistrationPanel implements EventPanel {
  private overlay: Overlay;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "event-panel");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(seed: number, rewards: EventRewards, done: (o: EventOutcome) => void): void {
    const sc = SCENARIOS[seed % SCENARIOS.length];
    const records = (seed >> 3) % 2 ? [sc.decoy, sc.form] : [sc.form, sc.decoy];
    let outcome: EventOutcome = "later";
    let selected = -1;

    this.overlay.setHeader({ title: "Registration check", avatar: NURUL, subtitle: "Nurul · Reception" });
    const speech = el("div", "case-speech", "This patient's form doesn't match the system. Which record is theirs?");
    const form = recordCard(sc.form, "reg-form");
    form.prepend(el("span", "reg-tag", "📝 Patient's form"));

    const list = el("div", "reg-records");
    const buttons = records.map((r, i) => {
      const b = el("button", "reg-record");
      b.append(el("span", "reg-tag", `Record ${i + 1}`), recordCard(r, "reg-lines"));
      b.addEventListener("click", () => {
        selected = i;
        buttons.forEach((o, j) => o.classList.toggle("selected", j === i));
        confirm.disabled = false;
        note.replaceChildren();
      });
      list.append(b);
      return b;
    });
    const note = el("div");

    const later = el("button", "secondary-btn", "Later");
    later.addEventListener("click", () => this.overlay.close());
    const skip = el("button", "link-btn", "Skip this request");
    skip.addEventListener("click", () => {
      outcome = "dismissed";
      this.overlay.close();
    });
    const confirm = el("button", "primary-btn", "Confirm match");
    confirm.disabled = true;
    confirm.addEventListener("click", () => {
      if (records[selected] !== sc.form) {
        buttons[selected].classList.add("nope");
        note.replaceChildren(feedback("Not quite. Compare the appointment time and IC digits one by one.", "bad"));
        return;
      }
      outcome = "resolved";
      const ok = el("button", "primary-btn wide", "Done");
      ok.addEventListener("click", () => this.overlay.close());
      this.overlay.body.replaceChildren(
        el("div", "case-speech", "Perfect, the record is fixed. Thank you! 🙏"),
        feedback(`Record matched · +${rewards.coins} 🪙  +${rewards.xp} XP`, "good")
      );
      this.overlay.footer.replaceChildren(ok);
    });

    const actions = el("div", "event-actions");
    actions.append(later, confirm);
    this.overlay.body.replaceChildren(speech, form, list, note);
    this.overlay.footer.replaceChildren(actions, skip);
    this.overlay.open(() => done(outcome));
  }
}
