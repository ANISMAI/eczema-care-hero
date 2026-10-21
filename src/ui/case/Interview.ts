import Overlay, { el, feedback } from "./Overlay";
import { POOR_QUESTIONS, seedOf, type PoorQuestion } from "../../data/cases/poorQuestions";
import type { CaseDefinition, InterviewPrompt } from "../../mission/types";

export interface InterviewHooks {
  def: CaseDefinition;
  /** Progress values already recorded: good prompt ids and "poor:<id>" (saved progress). */
  asked(): string[];
  ask(value: string): void;
  /** A question that wasn't kind or helpful (lowers this step's reward a little). */
  wrongPick(): void;
  /** All good prompts asked and the player taps "please take a look". */
  done(): void;
  onClose(): void;
}

/** Poor questions shown beside the good one in each round (3 choices per round). */
const POOR_PER_ROUND = 2;

type Choice = { kind: "good"; p: InterviewPrompt } | { kind: "poor"; p: PoorQuestion };

/**
 * Step B, in Consultation: a short chat with the patient (brief section 04), one round per good
 * question. Each round offers three questions: the good one and two that a kind doctor wouldn't
 * ask; picking one of those makes the patient a little sad and shows a short tip. The good
 * answer becomes a case note and the next round starts.
 */
export default class Interview {
  private overlay: Overlay;
  private h!: InterviewHooks;
  private rounds: Choice[][] = [];

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "case-interview");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  open(h: InterviewHooks): void {
    this.h = h;
    const p = h.def.patient;
    this.rounds = this.mix();
    this.overlay.setHeader({ title: p.name, avatar: p.portrait, subtitle: `${p.fullName} · ${p.age}` });
    this.render(h.def.interview.intro);
    this.overlay.open(() => h.onClose());
  }

  close(): void {
    this.overlay.close();
  }

  /** One round per good prompt: it and two poor ones (different each round), order fixed per visit. */
  private mix(): Choice[][] {
    let s = seedOf(`${this.h.def.id}|${this.h.def.patient.fullName}`);
    const rand = () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const pool = [...POOR_QUESTIONS].sort(() => rand() - 0.5);
    return this.h.def.interview.prompts.map((good, i) => {
      const poor = Array.from({ length: POOR_PER_ROUND }, (_, k) => pool[(i * POOR_PER_ROUND + k) % pool.length]);
      const round: Choice[] = [{ kind: "good", p: good }, ...poor.map((p) => ({ kind: "poor" as const, p }))];
      return round.sort(() => rand() - 0.5);
    });
  }

  private render(speech: string, tip?: HTMLElement, sad = false): void {
    const { interview } = this.h.def;
    const asked = this.h.asked();
    const goodLeft = interview.prompts.filter((pr) => !asked.includes(pr.id));

    const bubble = el("div", sad ? "case-speech sad" : "case-speech", speech);
    const notes = el("div", "case-notes");
    notes.append(el("strong", "", "📝 Case notes"));
    const list = el("ul");
    for (const pr of interview.prompts) if (asked.includes(pr.id)) list.append(el("li", "", pr.note));
    if (!list.childElementCount) list.append(el("li", "muted", `Choose kind, helpful questions to ask ${this.h.def.patient.name}`));
    notes.append(list);
    this.overlay.body.replaceChildren(bubble, ...(tip ? [tip] : []), notes);

    if (goodLeft.length) {
      // the first round whose good question hasn't been asked yet
      const index = this.rounds.findIndex((r) => r.some((c) => c.kind === "good" && !asked.includes(c.p.id)));
      const choices = el("div", "ask-list");
      choices.append(el("div", "ask-round", `Question ${index + 1} of ${this.rounds.length}`));
      for (const c of this.rounds[index]) {
        const usedPoor = c.kind === "poor" && asked.includes(`poor:${c.p.id}`);
        const b = el("button", usedPoor ? "ask-btn poor" : "ask-btn");
        b.append(el("span", "ask-icon", usedPoor ? "😟" : "💬"), el("span", "", c.p.question));
        b.disabled = usedPoor;
        b.addEventListener("click", () => {
          if (c.kind === "good") {
            this.h.ask(c.p.id);
            return this.render(c.p.answer);
          }
          this.h.ask(`poor:${c.p.id}`);
          this.h.wrongPick();
          this.render(c.p.reaction, feedback(c.p.why, "bad"), true);
        });
        choices.append(b);
      }
      this.overlay.footer.replaceChildren(choices);
      return;
    }
    // every good question asked: the patient's closing line, then off to the doctor
    if (speech !== interview.outro && interview.prompts.some((pr) => pr.answer === speech)) {
      const next = el("button", "primary-btn wide", "Next");
      next.addEventListener("click", () => this.render(interview.outro));
      this.overlay.footer.replaceChildren(next);
      return;
    }
    bubble.textContent = interview.outro;
    bubble.classList.remove("sad");
    const go = el("button", "primary-btn wide", `🩺  ${this.h.def.consult.doctor}, please take a look`);
    go.addEventListener("click", () => {
      this.h.done();
      this.overlay.close();
    });
    this.overlay.footer.replaceChildren(go);
  }
}
