import { play } from "../../game/audio";
import Overlay, { el, feedback } from "./Overlay";
import { POOR_QUESTIONS, seedOf, type PoorQuestion } from "../../data/cases/poorQuestions";
import { REACTION_LABEL } from "../../data/phase5/personalities";
import { tr } from "../../data/phase5/text";
import type { CaseDefinition, DialogueTurn, InterviewPrompt, Reaction } from "../../mission/types";

/** Phase 5: this visit's personality lines (data/phase5/select.ts). */
export interface InterviewFlavor {
  greeting: string | null;
  greetReaction: Reaction | null;
  /** The scenario's opening line for this visit. */
  intro: string;
  /** No comedic reactions (serious scenario). */
  serious: boolean;
  intensity: 1 | 2 | 3;
}

export interface InterviewHooks {
  def: CaseDefinition;
  flavor?: InterviewFlavor;
  /** Progress values already recorded (saved): prompt ids and "poor:<id>"; or "greeted",
   *  "turn:<id>" and "weak:<turn>:<choice>" for a Phase 5 chat. */
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

interface Said {
  text: string;
  reaction?: Reaction | null;
  tip?: HTMLElement;
  sad?: boolean;
}

/**
 * Step B, in Consultation: a short chat with the patient. Two forms:
 *  - Phase 2–3 visits: one round per good question, beside two questions a kind doctor wouldn't
 *    ask (a poor pick makes the patient a little sad and shows a short tip).
 *  - Phase 5 visits: a personality greeting, then 2–3 turns where the patient says something and
 *    the doctor picks one of 2–3 replies. A weak reply gets a gentle tip and another try.
 * Either way the good answers become case notes, and the patient's portrait reacts lightly
 * (never in a serious case).
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
    this.overlay.setHeader({ title: p.name, avatar: p.portrait, subtitle: `${p.fullName} · ${p.age}` });
    this.overlay.card.classList.toggle("serious", !!h.flavor?.serious);
    if (h.def.interview.turns?.length) this.renderTurns(null);
    else {
      this.rounds = this.mix();
      if (h.flavor?.greeting && !h.asked().includes("greeted")) this.greet(() => this.render(h.def.interview.intro));
      else this.render(h.def.interview.intro);
    }
    this.overlay.open(() => {
      this.overlay.react(null);
      h.onClose();
    });
  }

  close(): void {
    this.overlay.close();
  }

  // ---------- shared ----------

  /** A reaction on the portrait, unless the case is serious. */
  private react(kind: Reaction | null | undefined): Reaction | null {
    if (!kind || this.h.flavor?.serious) {
      this.overlay.react(null);
      return null;
    }
    this.overlay.react(kind, this.h.flavor?.intensity ?? 2);
    return kind;
  }

  /** The patient's speech bubble, with an emoji-free caption of their reaction. */
  private bubble(said: Said): HTMLElement {
    const box = el("div", said.sad ? "case-speech sad" : "case-speech");
    const shown = this.react(said.reaction);
    if (shown) box.append(el("em", "react-caption", `${this.h.def.patient.name} ${REACTION_LABEL[shown]}`));
    box.append(document.createTextNode(said.text));
    return box;
  }

  private nextButton(onClick: () => void, label = tr("ui.next")): HTMLButtonElement {
    const b = el("button", "primary-btn wide", label);
    b.addEventListener("click", onClick);
    return b;
  }

  /** Phase 5 greeting (first visit / returning / casual), shown once per visit. */
  private greet(then: () => void): void {
    const f = this.h.flavor!;
    this.overlay.body.replaceChildren(this.bubble({ text: f.greeting!, reaction: f.greetReaction }));
    this.overlay.footer.replaceChildren(
      this.nextButton(() => {
        this.h.ask("greeted");
        then();
      })
    );
  }

  private takeLookButton(): HTMLButtonElement {
    return this.nextButton(() => {
      this.h.done();
      this.overlay.close();
    }, tr("ui.takeLook", { doctor: this.h.def.consult.doctor }));
  }

  // ---------- Phase 5: branching turns ----------

  private renderTurns(said: Said | null): void {
    const turns = this.h.def.interview.turns!;
    const asked = this.h.asked();
    const f = this.h.flavor;
    if (f?.greeting && !asked.includes("greeted")) return this.greet(() => this.renderTurns(null));
    const doneIds = turns.filter((tn) => asked.includes(`turn:${tn.id}`)).map((tn) => tn.id);
    const index = turns.findIndex((tn) => !doneIds.includes(tn.id));
    const notes = this.turnNotes(turns, doneIds);
    const parts: HTMLElement[] = [];
    if (f?.serious) parts.push(feedback(tr("ui.serious"), "info"));

    if (index < 0) {
      // every turn answered: the last reply (if just given), then the outro and off to the doctor
      if (said) {
        parts.push(this.bubble(said), notes);
        this.overlay.body.replaceChildren(...parts);
        this.overlay.footer.replaceChildren(this.nextButton(() => this.renderTurns(null)));
        return;
      }
      parts.push(this.bubble({ text: this.h.def.interview.outro }), notes);
      this.overlay.body.replaceChildren(...parts);
      this.overlay.footer.replaceChildren(this.takeLookButton());
      return;
    }

    const current = turns[index];
    const opening: Said = { text: current.line ?? (index === 0 ? f?.intro ?? this.h.def.interview.intro : ""), reaction: current.reaction };
    const speech = said ?? opening;
    parts.push(this.bubble(speech));
    if (speech.tip) parts.push(speech.tip);
    parts.push(notes);
    this.overlay.body.replaceChildren(...parts);

    // a good reply was just shown: Next leads to the next turn's line
    if (said && !said.sad) {
      this.overlay.footer.replaceChildren(this.nextButton(() => this.renderTurns(null)));
      return;
    }
    this.overlay.footer.replaceChildren(this.choiceList(current, index, turns.length));
  }

  private choiceList(current: DialogueTurn, index: number, total: number): HTMLElement {
    const asked = this.h.asked();
    const list = el("div", "ask-list");
    list.append(el("div", "ask-round", tr("ui.turn", { n: index + 1, total })));
    for (const c of current.choices) {
      const used = !c.good && asked.includes(`weak:${current.id}:${c.id}`);
      const b = el("button", used ? "ask-btn poor" : "ask-btn");
      b.dataset.audio = "own";
      b.append(el("span", "ask-icon", used ? "😟" : "💬"), el("span", "", c.text));
      b.disabled = used;
      b.addEventListener("click", () => {
        play(c.good ? "good" : "gentle");
        if (c.good) {
          this.h.ask(`turn:${current.id}`);
          return this.renderTurns({ text: c.reply, reaction: c.reaction });
        }
        this.h.ask(`weak:${current.id}:${c.id}`);
        this.h.wrongPick();
        this.renderTurns({ text: c.reply, reaction: c.reaction, tip: feedback(c.feedback ?? "", "bad"), sad: true });
      });
      list.append(b);
    }
    return list;
  }

  private turnNotes(turns: DialogueTurn[], doneIds: string[]): HTMLElement {
    const notes = el("div", "case-notes");
    notes.append(el("strong", "", tr("ui.notes")));
    const list = el("ul");
    for (const tn of turns) {
      if (!doneIds.includes(tn.id)) continue;
      const note = tn.choices.find((c) => c.good)?.note;
      if (note) list.append(el("li", "", note));
    }
    if (!list.childElementCount) list.append(el("li", "muted", tr("ui.notesEmpty", { name: this.h.def.patient.name })));
    notes.append(list);
    return notes;
  }

  // ---------- Phase 2–3: question rounds ----------

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

    const bubble = this.bubble({ text: speech, sad, reaction: sad ? "shy" : null });
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
        b.dataset.audio = "own";
        b.append(el("span", "ask-icon", usedPoor ? "😟" : "💬"), el("span", "", c.p.question));
        b.disabled = usedPoor;
        b.addEventListener("click", () => {
          play(c.kind === "good" ? "good" : "gentle");
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
    this.overlay.body.replaceChildren(this.bubble({ text: interview.outro }), ...(tip ? [tip] : []), notes);
    const go = el("button", "primary-btn wide", `🩺  ${this.h.def.consult.doctor}, please take a look`);
    go.addEventListener("click", () => {
      this.h.done();
      this.overlay.close();
    });
    this.overlay.footer.replaceChildren(go);
  }
}
