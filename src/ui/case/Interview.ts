import Overlay, { el } from "./Overlay";
import type { CaseDefinition } from "../../mission/types";

export interface InterviewHooks {
  def: CaseDefinition;
  /** Prompt ids already asked (saved progress). */
  asked(): string[];
  ask(promptId: string): void;
  /** All prompts asked and the player taps "Let's see the doctor". */
  done(): void;
  onClose(): void;
}

/**
 * Step B, in Consultation: a short chat with the patient (brief section 04). The player picks
 * which question to ask next; every question is a good one (no quiz). Answers are collected
 * as case notes for the doctor.
 */
export default class Interview {
  private overlay: Overlay;
  private h!: InterviewHooks;

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-interview");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(h: InterviewHooks): void {
    this.h = h;
    const p = h.def.patient;
    this.overlay.setHeader({ title: p.name, avatar: p.portrait, subtitle: `${p.fullName} · ${p.age}` });
    this.render(h.def.interview.intro);
    this.overlay.open(() => h.onClose());
  }

  close(): void {
    this.overlay.close();
  }

  private render(speech: string): void {
    const { interview } = this.h.def;
    const asked = this.h.asked();
    const bubble = el("div", "case-speech", speech);

    const notes = el("div", "case-notes");
    notes.append(el("strong", "", "📝 Case notes"));
    const list = el("ul");
    for (const pr of interview.prompts) if (asked.includes(pr.id)) list.append(el("li", "", pr.note));
    if (!asked.length) list.append(el("li", "muted", "Ask Amina a question below"));
    notes.append(list);

    this.overlay.body.replaceChildren(bubble, notes);

    const left = interview.prompts.filter((pr) => !asked.includes(pr.id));
    if (left.length) {
      const choices = el("div", "ask-list");
      for (const pr of left) {
        const b = el("button", "ask-btn");
        b.append(el("span", "ask-icon", "💬"), el("span", "", pr.question));
        b.addEventListener("click", () => {
          this.h.ask(pr.id);
          this.render(pr.answer);
        });
        choices.append(b);
      }
      this.overlay.footer.replaceChildren(choices);
      return;
    }
    // everything asked: the patient's closing line, then off to the doctor
    if (speech !== interview.outro && asked.length === interview.prompts.length && this.lastWasAnswer(speech)) {
      const next = el("button", "primary-btn wide", "Next");
      next.addEventListener("click", () => this.render(interview.outro));
      this.overlay.footer.replaceChildren(next);
      return;
    }
    bubble.textContent = interview.outro;
    const go = el("button", "primary-btn wide", `🩺  ${this.h.def.consult.doctor}, please take a look`);
    go.addEventListener("click", () => {
      this.h.done();
      this.overlay.close();
    });
    this.overlay.footer.replaceChildren(go);
  }

  private lastWasAnswer(speech: string): boolean {
    return this.h.def.interview.prompts.some((pr) => pr.answer === speech);
  }
}
