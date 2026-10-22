import Phaser from "phaser";
import MissionController from "./MissionController";
import CaseNpc from "../entities/CaseNpc";
import CaseDialog from "../ui/case/CaseDialog";
import Treatment from "../ui/case/Treatment";
import Interview, { type InterviewFlavor } from "../ui/case/Interview";
import Consultation from "../ui/case/Consultation";
import Announcement from "../ui/case/Announcement";
import { REWARDS } from "../data/gameplay";
import { makeWorldTag } from "../art/tags";
import { speechBubble } from "../art/bubble";
import { spritePortrait } from "../ui/spritePortrait";
import { buildCase } from "../data/cases";
import { PATIENT } from "../data/cases/steps";
import { getPatient } from "../data/patients";
import { COLLECT_SPOT, ENTRANCE, type QueueEntry } from "../clinic/ClinicFlow";
import { getRoomById, type InteractableDef, type Point, type RoomId } from "../data/rooms";
import type { CharacterDirection } from "../data/assets";
import { CASE_FLOW, type CaseDefinition, type CaseStatus, type StepDef } from "./types";
import type { VisitRecord } from "../systems/Progress";
import { t } from "../game/i18n";

/** "Thanks, doctor! I'm so glad…" -> "Thanks, doctor!" (short enough for a speech bubble). */
function firstSentence(text: string): string {
  const m = text.match(/^.*?[.!?](?=s|$)/);
  return m ? m[0] : text;
}

/** What the case needs from the scene. */
export interface CaseHost {
  scene: Phaser.Scene;
  uiRoot: HTMLElement;
  /** Freeze / restore walking control while a panel or cut-scene runs. */
  lock(): void;
  unlock(): void;
  addInteractable(item: InteractableDef): void;
  removeInteractable(id: string): void;
  findInteractable(id: string): InteractableDef | undefined;
  toast(text: string): void;
  /** Objective banner: text and progress (0..1), or null to hide it. */
  setObjective(text: string | null, progress?: number): void;
  /** Care points (main score) and case XP. */
  awardCare(points: number): void;
  completeCase(xp: number): void;
  /** The case reached a new state (safe point for optional events). */
  onStatus(status: CaseStatus): void;
  /** Care trays: a care session needs a clean one and uses it when it's done. */
  trayReady(): boolean;
  /** Clean trays on the rack and the total (shown in the treatment screen). */
  trayStatus(): { clean: number; total: number };
  noTrayLine(): string;
  useTray(): void;
  /** A finished visit, for the end-of-day summary. */
  recordVisit(v: VisitRecord): void;
  /** Phase 3 doctor queue (ClinicFlow). */
  nextInQueue(): QueueEntry | null;
  callNext(): QueueEntry | null;
  patientNpc(instanceId: string): CaseNpc | null;
  caseCompleted(instanceId: string): void;
  /** The patient walked out of the clinic. */
  visitorGone(instanceId: string): void;
  /** Phase 5: this visit's greeting and opening line (by personality and visit history). */
  visitFlavor?(identityId: string, templateId: string): InterviewFlavor;
  /** Phase 5: a doctor visit was completed (only then is it added to the patient's history). */
  visitDone?(identityId: string, templateId: string): void;
}

const DEFAULT_LIFT = 62; // matches the scene's default bubble height
const CALL_DESKS = ["consult-desk", "specialist"];

function spot(room: RoomId, dx: number, dy: number): Point {
  const b = getRoomById(room).bounds;
  return { x: b.x + dx, y: b.y + dy };
}
const CONSULT_SPOT = spot("consult", 150, 214); // in front of the doctor's desk
const CARE_SPOT = spot("care", 172, 186); // beside the care bed

/** Where the patient being seen stands in each state (null = not with the doctor). */
const PLACE: Record<CaseStatus, { at: Point; dir: CharacterDirection } | null> = {
  AVAILABLE: null,
  ACCEPTED: { at: CONSULT_SPOT, dir: "up" },
  INTERVIEWED: { at: CONSULT_SPOT, dir: "up" },
  DOCTOR_REVIEWED: { at: CARE_SPOT, dir: "down" },
  CARE_COMPLETED: null,
  HANDOVER_DONE: null,
  COMPLETED: null,
};

/**
 * Runs the doctor's side of a visit. Phase 3: patients arrive on their own and wait in the
 * doctor queue (ClinicFlow); the doctor calls the first one in at the Consultation desk. Then:
 * chat and Dr. Lim's assessment in the same room, moisturiser in the Care Room when the plan
 * needs it, and the patient collects any approved item from Grace and goes home on their own.
 * One case is open at a time. Every state change goes through the MissionController, which
 * guards against skipping or repeating steps.
 */
export default class CaseRunner {
  readonly mission = new MissionController();
  private host: CaseHost;
  /** The patient being seen (their sprite belongs to ClinicFlow). */
  private patient: CaseNpc | null = null;
  private listedId: string | null = null;
  private questTag: Phaser.GameObjects.Container;
  private dialog: CaseDialog;
  private interview: Interview;
  private consultation: Consultation;
  private treatment: Treatment;
  private announcement: Announcement;

  constructor(host: CaseHost) {
    this.host = host;
    this.questTag = makeWorldTag(host.scene, "NEXT", 0xf0679e);
    this.dialog = new CaseDialog(host.uiRoot);
    this.interview = new Interview(host.uiRoot);
    this.consultation = new Consultation(host.uiRoot);
    this.treatment = new Treatment(host.uiRoot);
    this.announcement = new Announcement(host.uiRoot);

    this.mission.onChange(() => this.refreshObjective());
    this.restore();
    this.refreshObjective();
  }

  private get def(): CaseDefinition {
    return this.mission.definition;
  }

  // ---------- world ----------

  /** After a reload: put the patient being seen where the saved state says. */
  private restore(): void {
    const visit = this.mission.visit;
    if (!visit) return;
    const npc = this.host.patientNpc(visit.instanceId);
    const s = this.mission.status;
    if (!npc || s === "COMPLETED") {
      // the patient had already finished (or vanished): the case record is closed
      if (npc) this.host.visitorGone(visit.instanceId);
      this.mission.reset();
      return;
    }
    this.patient = npc;
    // refreshed in the moment between the last step and the result: finish now
    if (s === "CARE_COMPLETED" || s === "HANDOVER_DONE") {
      npc.standAt(CARE_SPOT, "down");
      this.host.scene.time.delayedCall(600, () => this.finishCase());
      return;
    }
    const place = PLACE[s];
    if (place) npc.standAt(place.at, place.dir);
    this.listPatient(true);
  }

  private walkPatientForState(onArrive?: () => void): void {
    const place = PLACE[this.mission.status];
    const npc = this.patient;
    if (!place || !npc) return;
    npc.walkTo(place.at, () => {
      npc.standAt(place.at, place.dir);
      this.refreshObjective();
      onArrive?.();
    });
    this.refreshObjective();
  }

  private listPatient(on: boolean): void {
    if (this.listedId) this.host.removeInteractable(this.listedId);
    this.listedId = null;
    if (on && this.patient) {
      this.host.addInteractable(this.patient.talk);
      this.listedId = this.patient.talk.id;
    }
  }

  /** Real interactable ids for a step's targets ("patient" = the patient being seen). */
  private targetIds(step: StepDef): string[] {
    return step.targets.map((t) => (t === PATIENT ? this.patient?.talk.id ?? "" : t)).filter(Boolean);
  }

  /** The interactable the player should go to next, if it is reachable right now. */
  questTarget(): InteractableDef | null {
    const step = this.mission.currentStep;
    if (!step) {
      // no case open: point at the desk when someone is waiting
      return this.host.nextInQueue() ? this.host.findInteractable(CALL_DESKS[0]) ?? null : null;
    }
    for (const id of this.targetIds(step)) {
      if (id === this.patient?.talk.id && (!this.listedId || this.patient.isWalking)) continue;
      const item = this.host.findInteractable(id);
      if (item) return item;
    }
    return null;
  }

  questRoom(): RoomId | null {
    const step = this.mission.currentStep;
    if (step) return step.room;
    return this.host.nextInQueue() ? "consult" : null;
  }

  update(): void {
    const target = this.questTarget();
    this.questTag.setVisible(!!target);
    if (target) this.questTag.setPosition(target.x, target.y - (target.markerLift ?? DEFAULT_LIFT) - 2);
  }

  /** Objective banner: the open case's next step, or the next patient to call. */
  refreshObjective(): void {
    const step = this.mission.currentStep;
    if (!step) {
      const next = this.host.nextInQueue();
      this.host.setObjective(next ? `${t("hud.nextPatient")} · ${t("hud.callNext", { name: next.name })}` : null, 0);
      return;
    }
    const progress = CASE_FLOW.indexOf(step.requires) / (CASE_FLOW.length - 1);
    const name = this.def.patient.name;
    const text = this.patient?.isWalking ? `${name} is on the way to ${getRoomById(step.room).label}…` : step.objective;
    this.host.setObjective(`${name} · ${text}`, progress);
  }

  // ---------- interactions ----------

  /** The step (if any) that `item` starts right now. */
  private stepFor(item: InteractableDef): StepDef | null {
    const step = this.mission.currentStep;
    return step && this.targetIds(step).includes(item.id) ? step : null;
  }

  /** The desk calls the next patient when no case is open. */
  private canCall(item: InteractableDef): QueueEntry | null {
    if (this.mission.inProgress || !CALL_DESKS.includes(item.id)) return null;
    return this.host.nextInQueue();
  }

  actionLabel(item: InteractableDef): string | null {
    const next = this.canCall(item);
    if (next) return `📢 Call ${next.name} in`;
    const step = this.stepFor(item);
    if (!step) return null;
    const name = this.def.patient.name;
    switch (step.kind) {
      case "interview":
        return `💬 Talk to ${name}`;
      case "consult":
        return "🩺 Look at the skin";
      case "care":
        return "🧴 Start care";
      default:
        return null; // automatic steps
    }
  }

  /** Handles the interaction if it is the current case step (or calling the next patient). */
  handle(item: InteractableDef): boolean {
    const next = this.canCall(item);
    if (next) {
      this.callPatient(next);
      return true;
    }
    const step = this.stepFor(item);
    if (!step) return false;
    if (item.id === this.patient?.talk.id && this.patient.isWalking) {
      this.host.toast(`🚶  ${this.def.patient.name} is on the way`);
      return true;
    }
    switch (step.kind) {
      case "interview":
        this.openInterview(step);
        break;
      case "consult":
        this.openConsult(step);
        break;
      case "care":
        this.openCare(step);
        break;
      default:
        return false; // automatic steps have no targets
    }
    return true;
  }

  /**
   * Friendly lines instead of dead ends (brief section 05): a later step's place tried too
   * early, or the desk with nobody waiting. Returns false for anything the case doesn't use.
   */
  hint(item: InteractableDef): boolean {
    if (!this.mission.inProgress && CALL_DESKS.includes(item.id)) {
      this.quickLine("Nurul", "assets/portraits/nurul.webp", "No one is waiting for the doctor right now. I'll send the next patient to the Waiting Area when they arrive 🙂");
      return true;
    }
    if (!this.mission.inProgress) return false;
    const ahead = this.def.steps.find((s) => this.mission.isAhead(s) && this.targetIds(s).includes(item.id) && s.early.text);
    if (!ahead) return false;
    this.quickLine(ahead.early.who, ahead.early.avatar, ahead.early.text);
    return true;
  }

  private quickLine(title: string, avatar: string, text: string, onDone?: () => void): void {
    this.host.lock();
    this.dialog.begin({ title, avatar }, () => {
      this.host.unlock();
      onDone?.();
    });
    void this.dialog.say(text, "OK").then(() => this.dialog.end());
  }

  /** Moves the case on, saves, and offers a safe point for optional events. */
  private advance(step: StepDef, points = 0): boolean {
    if (!this.mission.advance(step.id, points)) return false;
    if (points) this.host.awardCare(points);
    this.host.onStatus(this.mission.status);
    return true;
  }

  /** Reward for a care interaction: full when right first time, smaller after a wrong pick. */
  private carePoints(step: StepDef): number {
    if (!step.rewarded) return 0;
    return this.mission.mistakesOf(step.id) === 0 ? REWARDS.correctCare : REWARDS.retriedCare;
  }

  // ---------- dev tools (src/dev/DevPanel.ts) ----------

  /** Dev: start a case for a visitor and jump straight to one of its activities. */
  devOpen(instanceId: string, identityId: string, templateId: string, stage: "interview" | "consult" | "care"): void {
    const npc = this.host.patientNpc(instanceId);
    if (!npc || !this.mission.start(templateId, { instanceId, identityId })) return;
    this.patient = npc;
    // step through the case (no rewards) until the wanted activity is due
    for (let guard = 0; guard < 8; guard++) {
      const step = this.mission.currentStep;
      if (!step || step.kind === stage) break;
      this.mission.advance(step.id);
    }
    const place = PLACE[this.mission.status];
    if (place) npc.standAt(place.at, place.dir);
    this.listPatient(true);
    this.refreshObjective();
    const step = this.mission.currentStep;
    if (!step) return;
    if (stage === "interview") this.openInterview(step);
    else if (stage === "consult") this.openConsult(step);
    else this.openCare(step);
  }

  // ---------- A: call the next patient in (Nurul has registered them) ----------

  private callPatient(next: QueueEntry): void {
    const patient = getPatient(next.identityId)!;
    const d = buildCase(next.templateId, patient);
    this.host.lock();
    this.dialog.begin({ title: `${d.patient.name} · case file`, avatar: d.patient.portrait, subtitle: "Registered by Nurul at Reception" }, () =>
      this.host.unlock()
    );
    // the case file: the patient's full figure on the left, the details on the right
    const card = document.createElement("div");
    card.className = "intake-file";
    const figure = document.createElement("div");
    figure.className = "intake-figure";
    const sprite = document.createElement("span");
    sprite.className = "intake-sprite";
    spritePortrait(sprite, patient.walk, patient.walk.rows.down * 3, 150);
    figure.append(sprite);
    const details = document.createElement("div");
    details.className = "intake-card";
    card.append(figure, details);
    const rows: [string, string][] = [
      ["Patient", `${d.patient.fullName}, ${d.patient.age}`],
      ["Visit", d.title],
      ["Reason", d.intake.reason],
      ["Your task", d.intake.objective],
    ];
    for (const [k, v] of rows) {
      const row = document.createElement("div");
      const key = document.createElement("span");
      key.textContent = k;
      const val = document.createElement("strong");
      val.textContent = v;
      row.append(key, val);
      details.append(row);
    }
    void this.dialog.say(`${d.patient.name} is first in the queue. Call them in when you're ready.`, `📢  Call ${d.patient.name} in`, card).then((ok) => {
      if (!ok) return; // closed without calling: nothing changes
      this.dialog.end();
      // the queue may have changed while the dialog was open (patience): take whoever is first
      const called = this.host.callNext();
      if (!called) return;
      const npc = this.host.patientNpc(called.instanceId);
      if (!npc || !this.mission.start(called.templateId, { instanceId: called.instanceId, identityId: called.identityId })) return;
      this.patient = npc;
      const step = this.mission.currentStep;
      if (!step || !this.advance(step)) return;
      this.listPatient(true);
      this.announcement.show(`${this.def.patient.fullName}, please come to Consultation.`);
      this.walkPatientForState(() => this.host.toast(`🙂  ${this.def.patient.name} is here`));
    });
  }

  // ---------- B + C: Consultation (chat, then Dr. Lim's assessment, same room) ----------

  private openInterview(step: StepDef): void {
    const m = this.mission;
    this.host.lock();
    const visit = m.visit;
    this.interview.open({
      def: this.def,
      flavor: visit ? this.host.visitFlavor?.(visit.identityId, m.snapshot.templateId) : undefined,
      asked: () => m.progressOf(step.id),
      ask: (id) => m.addProgress(step.id, id),
      wrongPick: () => m.mistake(step.id),
      done: () => {
        const points = this.carePoints(step);
        if (!this.advance(step, points)) return;
        this.host.toast(`💜  +${points} care points`);
        // straight on to the assessment once the chat panel has closed
        this.host.scene.time.delayedCall(250, () => {
          const next = this.mission.currentStep;
          if (next?.kind === "consult") this.openConsult(next);
        });
      },
      onClose: () => this.host.unlock(),
    });
  }

  private openConsult(step: StepDef): void {
    if (this.consultation.isOpen) return;
    const m = this.mission;
    this.host.lock();
    this.consultation.open({
      def: this.def,
      inspected: () => m.progressOf(step.id),
      inspect: (id) => m.addProgress(step.id, id),
      done: () => {
        if (!this.advance(step)) return;
        // to the Care Room if the plan needs hands-on care; otherwise the visit is done
        if (this.mission.currentStep?.kind === "care") {
          this.walkPatientForState(() => this.host.toast(`🙂  ${this.def.patient.name} is in the Care Room`));
        } else {
          this.host.scene.time.delayedCall(300, () => this.finishCase());
        }
      },
      onClose: () => this.host.unlock(),
    });
  }

  // ---------- D: Care Room ----------

  private openCare(step: StepDef): void {
    const care = this.def.care;
    if (this.treatment.isOpen || !care) return;
    // a session already under way keeps its tray; a new one needs a clean tray from the rack
    if (!this.mission.progressOf(step.id).length && !this.host.trayReady()) {
      this.quickLine("Nurse Amy", "assets/portraits/amy.webp", this.host.noTrayLine());
      return;
    }
    const m = this.mission;
    const doneKey = (id: string) => `done:${id}`;
    const isDone = (id: string) => m.progressOf(step.id).includes(doneKey(id));
    this.host.lock();
    this.treatment.open({
      patient: this.def.patient,
      session: care,
      // the tray in use isn't clean any more; it is marked used when the session ends
      trays: (() => {
        const t = this.host.trayStatus();
        return { left: Math.max(0, t.clean - 1), total: t.total };
      })(),
      current: () => care.steps.find((s) => !isDone(s.id)) ?? null,
      isDone,
      progressOf: (id) => m.progressOf(step.id).filter((v) => v.startsWith(`${id}:`)).map((v) => v.slice(id.length + 1)),
      addProgress: (id, v) => m.addProgress(step.id, `${id}:${v}`),
      wrongPick: () => m.mistake(step.id),
      complete: (id) => {
        m.addProgress(step.id, doneKey(id));
        if (care.steps.every((s) => isDone(s.id))) {
          // a short pause so the patient's smile is seen
          this.host.scene.time.delayedCall(1100, () => {
            this.treatment.close();
            if (!m.isCurrent(step.id)) return;
            // the tray goes to the sink first, so "Amy is busy" takes priority over random events
            this.host.useTray();
            if (this.advance(step, this.carePoints(step))) this.finishCase();
          });
        }
      },
      onClose: () => this.host.unlock(),
    });
  }

  // ---------- E + F: automatic — collects any item from Grace, then goes home ----------

  /**
   * Closes the case quietly, so the day keeps flowing: the patient says thank you in a speech
   * bubble, a toast shows the care points, and the visit is recorded for the end-of-day summary
   * (no result panel). The patient then collects any item from Grace and goes home on their own.
   */
  private finishCase(): void {
    for (const kind of ["handover", "farewell"]) {
      const step = this.mission.currentStep;
      if (step?.kind === kind) this.advance(step);
    }
    const visit = this.mission.visit;
    if (this.mission.status !== "COMPLETED" || !visit) return;
    const reward = REWARDS.caseComplete;
    this.mission.recordCompletion(reward.care);
    this.host.awardCare(reward.care);
    this.host.completeCase(reward.xp);
    this.host.caseCompleted(visit.instanceId);
    this.host.visitDone?.(visit.identityId, this.mission.snapshot.templateId);
    const d = this.def;
    const rewarded = d.steps.filter((st) => st.rewarded).length;
    const points = this.mission.totalPoints();
    this.host.recordVisit({
      name: d.patient.name,
      portrait: d.patient.portrait,
      title: d.title,
      points,
      maxPoints: reward.care + rewarded * REWARDS.correctCare,
      takeaway: d.takeaway,
    });

    // the patient leaves on their own; the doctor can call the next one straight away
    const npc = this.patient;
    const collected = d.collected;
    this.listPatient(false);
    this.patient = null;
    if (npc) {
      const at = npc.position;
      speechBubble(this.host.scene, at.x, at.y - 62, firstSentence(d.thanks), 2600);
    }
    this.host.toast(`💜  ${d.patient.name} helped · +${points} care pts`);
    this.refreshObjective();
    const goHome = () => npc?.walkTo(ENTRANCE, () => this.host.visitorGone(visit.instanceId));
    if (npc && collected) {
      // give the thank-you a moment before walking off to the Pharmacy
      this.host.scene.time.delayedCall(1200, () =>
        npc.walkTo(COLLECT_SPOT, () => {
          npc.standAt(COLLECT_SPOT, "up");
          this.host.toast(collected);
          this.host.scene.time.delayedCall(1500, goHome);
        })
      );
    } else this.host.scene.time.delayedCall(1200, goHome);
  }

  /**
   * Closing time with a patient still being seen: they're rebooked for another day and leave.
   * Returns true if someone was rebooked. Points already earned are kept.
   */
  closeDay(): boolean {
    const visit = this.mission.visit;
    const open = this.mission.inProgress && !!visit;
    if (visit) this.host.visitorGone(visit.instanceId);
    this.listPatient(false);
    this.patient = null;
    this.mission.reset();
    return open;
  }

  get caseOpen(): boolean {
    return this.mission.inProgress;
  }
}
