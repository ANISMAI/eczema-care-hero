import Phaser from "phaser";
import MissionController from "./MissionController";
import CaseNpc from "../entities/CaseNpc";
import CaseDialog from "../ui/case/CaseDialog";
import Treatment from "../ui/case/Treatment";
import Interview from "../ui/case/Interview";
import Consultation from "../ui/case/Consultation";
import Announcement from "../ui/case/Announcement";
import CaseResult from "../ui/case/CaseResult";
import { REWARDS } from "../data/gameplay";
import { makeWorldTag } from "../art/tags";
import { NPC_POSE_SHEETS, NPC_WALKER_SHEETS, type CharacterDirection } from "../data/assets";
import { HALLWAY, getRoomById, type InteractableDef, type Point, type Rect, type RoomId } from "../data/rooms";
import { CASE_FLOW, type CaseDefinition, type CaseStatus, type StepDef } from "./types";

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
  npcSolids: Rect[];
  /** Care points (main score) and case XP. */
  awardCare(points: number): void;
  completeCase(xp: number): void;
  /** The case reached a new state (safe point for optional events). */
  onStatus(status: CaseStatus): void;
  endShift(): void;
}

const PATIENT_ID = "patient-amina";
const DEFAULT_LIFT = 62; // matches the scene's default bubble height

function spot(room: RoomId, dx: number, dy: number): Point {
  const b = getRoomById(room).bounds;
  return { x: b.x + dx, y: b.y + dy };
}
const SEAT = spot("waiting", 192, 132); // feet on the empty middle waiting chair
const CONSULT_SPOT = spot("consult", 150, 214); // in front of the doctor's desk
const CARE_SPOT = spot("care", 172, 186); // beside the care bed
const PHARMACY_SPOT = spot("pharmacy", 190, 210); // in front of the pharmacy counter
const EXIT = { x: HALLWAY.x + HALLWAY.width / 2, y: HALLWAY.y + HALLWAY.height - 40 };

/** Where the patient waits in each state (null = gone home). */
const PLACE: Record<CaseStatus, { at: Point; dir: CharacterDirection; sit?: boolean } | null> = {
  AVAILABLE: { at: SEAT, dir: "down", sit: true },
  ACCEPTED: { at: CONSULT_SPOT, dir: "up" },
  INTERVIEWED: { at: CONSULT_SPOT, dir: "up" },
  DOCTOR_REVIEWED: { at: CARE_SPOT, dir: "down" },
  CARE_COMPLETED: { at: PHARMACY_SPOT, dir: "up" },
  HANDOVER_DONE: { at: PHARMACY_SPOT, dir: "up" },
  COMPLETED: null,
};

/**
 * Runs the patient case through the world. The patient comes to the doctor, not the other way
 * round: Nurul registers her, the doctor calls her into Consultation (chat + Dr. Lim's
 * assessment in the same room), then moisturiser in the Care Room. She then collects her cream
 * from Grace at the Pharmacy on her own and goes home. Pharmacy problems are optional events,
 * not a daily step. Every state change goes through the MissionController, which guards
 * against skipping or repeating steps.
 */
export default class CaseRunner {
  readonly mission = new MissionController();
  private host: CaseHost;
  private patient: CaseNpc;
  private patientListed = false;
  private questTag: Phaser.GameObjects.Container;
  private dialog: CaseDialog;
  private interview: Interview;
  private consultation: Consultation;
  private treatment: Treatment;
  private announcement: Announcement;
  private result: CaseResult;

  constructor(host: CaseHost) {
    this.host = host;
    const talk: InteractableDef = {
      id: PATIENT_ID,
      kind: "npc",
      label: "Amina",
      icon: "🙂",
      x: 0,
      y: 0,
      radius: 46,
      markerLift: 52,
      markerOnlyWhenNear: true,
      dialogTitle: "Amina",
      dialogText: "",
    };
    this.patient = new CaseNpc(host.scene, NPC_WALKER_SHEETS.amina, NPC_POSE_SHEETS.aminaSit, talk, host.npcSolids);
    this.questTag = makeWorldTag(host.scene, "NEXT", 0xf0679e);
    this.dialog = new CaseDialog(host.uiRoot);
    this.interview = new Interview(host.uiRoot);
    this.consultation = new Consultation(host.uiRoot);
    this.treatment = new Treatment(host.uiRoot);
    this.announcement = new Announcement(host.uiRoot);
    this.result = new CaseResult(host.uiRoot);

    this.mission.onChange(() => this.refreshObjective());
    this.placePatientForState();
    this.refreshObjective();
    // refreshed in the moment between the care session and the result: finish the case now
    const s = this.mission.status;
    if (s === "CARE_COMPLETED" || s === "HANDOVER_DONE") host.scene.time.delayedCall(600, () => this.finishCase());
  }

  private get def(): CaseDefinition {
    return this.mission.definition;
  }

  // ---------- world ----------

  /** Puts the patient where the saved state says she should be (load, refresh, new shift). */
  private placePatientForState(): void {
    const place = PLACE[this.mission.status];
    if (!place) {
      this.patient.hide();
      this.setPatientListed(false);
      return;
    }
    if (place.sit) this.patient.sitAt(place.at);
    else this.patient.standAt(place.at, place.dir);
    this.setPatientListed(true);
  }

  /** The patient walks to where the new state needs her. */
  private walkPatientForState(onArrive?: () => void): void {
    const place = PLACE[this.mission.status];
    if (!place) return;
    const from = this.mission.status === "ACCEPTED" ? SEAT : undefined;
    this.patient.walkTo(
      place.at,
      () => {
        this.patient.standAt(place.at, place.dir);
        this.refreshObjective();
        onArrive?.();
      },
      from
    );
    this.refreshObjective();
  }

  private setPatientListed(on: boolean): void {
    if (on === this.patientListed) return;
    this.patientListed = on;
    if (on) this.host.addInteractable(this.patient.talk);
    else this.host.removeInteractable(PATIENT_ID);
  }

  /** The interactable the player should go to next, if it is reachable right now. */
  questTarget(): InteractableDef | null {
    const step = this.mission.currentStep;
    if (!step) return null;
    for (const id of step.targets) {
      if (id === PATIENT_ID && (!this.patientListed || this.patient.isWalking)) continue;
      const item = this.host.findInteractable(id);
      if (item) return item;
    }
    return null;
  }

  questRoom(): RoomId | null {
    return this.mission.currentStep?.room ?? null;
  }

  update(deltaMs: number): void {
    this.patient.update(deltaMs);
    const target = this.questTarget();
    this.questTag.setVisible(!!target);
    if (target) this.questTag.setPosition(target.x, target.y - (target.markerLift ?? DEFAULT_LIFT) - 2);
  }

  private refreshObjective(): void {
    const step = this.mission.currentStep;
    if (!step) {
      this.host.setObjective(null);
      return;
    }
    const progress = CASE_FLOW.indexOf(step.requires) / (CASE_FLOW.length - 1);
    const name = this.def.patient.name;
    const text = this.patient.isWalking ? `${name} is on her way to ${getRoomById(step.room).label}…` : step.objective;
    this.host.setObjective(`${this.def.title} · ${text}`, progress);
  }

  // ---------- interactions ----------

  /** The step (if any) that `item` starts right now. */
  private stepFor(item: InteractableDef): StepDef | null {
    const step = this.mission.currentStep;
    return step && step.targets.includes(item.id) ? step : null;
  }

  actionLabel(item: InteractableDef): string | null {
    const step = this.stepFor(item);
    if (!step) return null;
    const name = this.def.patient.name;
    switch (step.kind) {
      case "call":
        return `📢 Call ${name} in`;
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

  /** Handles the interaction if it is the current case step. */
  handle(item: InteractableDef): boolean {
    const step = this.stepFor(item);
    if (!step) return false;
    if (item.id === PATIENT_ID && this.patient.isWalking) {
      this.host.toast(`🚶  ${this.def.patient.name} is on her way`);
      return true;
    }
    switch (step.kind) {
      case "call":
        this.callPatient(step);
        break;
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
   * Out-of-sequence: a target of a later step gets a friendly hint instead of breaking the
   * flow (brief section 05). Returns false for anything the case doesn't care about.
   */
  hint(item: InteractableDef): boolean {
    const ahead = this.def.steps.find((s) => this.mission.isAhead(s) && s.targets.includes(item.id) && s.early.text);
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

  // ---------- A: call the patient in (Nurul has registered her) ----------

  private callPatient(step: StepDef): void {
    const d = this.def;
    this.host.lock();
    this.dialog.begin({ title: `${d.title} · case file`, avatar: "assets/portraits/nurul.webp", subtitle: "Registered by Nurul at Reception" }, () =>
      this.host.unlock()
    );
    const card = document.createElement("div");
    card.className = "intake-card";
    const rows: [string, string][] = [
      ["Patient", `${d.patient.fullName}, ${d.patient.age}`],
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
      card.append(row);
    }
    void this.dialog.say(`${d.patient.name} is registered and waiting in the Waiting Area. Call her in when you're ready.`, `📢  Call ${d.patient.name} in`, card).then((ok) => {
      if (!ok) return; // closed without calling: nothing changes
      this.dialog.end();
      if (!this.advance(step)) return;
      this.announcement.show(`${d.patient.fullName}, please come to Consultation.`);
      this.walkPatientForState(() => this.host.toast(`🙂  ${d.patient.name} is here`));
    });
  }

  // ---------- B + C: Consultation (chat, then Dr. Lim's assessment, same room) ----------

  private openInterview(step: StepDef): void {
    const m = this.mission;
    this.host.lock();
    this.interview.open({
      def: this.def,
      asked: () => m.progressOf(step.id),
      ask: (id) => m.addProgress(step.id, id),
      done: () => {
        if (!this.advance(step)) return;
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
        if (this.advance(step)) this.walkPatientForState(() => this.host.toast(`🙂  ${this.def.patient.name} is in the Care Room`));
      },
      onClose: () => this.host.unlock(),
    });
  }

  // ---------- D: Care Room ----------

  private openCare(step: StepDef): void {
    if (this.treatment.isOpen) return;
    const m = this.mission;
    const care = this.def.care;
    const doneKey = (id: string) => `done:${id}`;
    const isDone = (id: string) => m.progressOf(step.id).includes(doneKey(id));
    this.host.lock();
    this.treatment.open({
      patient: this.def.patient,
      session: care,
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
            if (this.advance(step, this.carePoints(step))) this.finishCase();
          });
        }
      },
      onClose: () => this.host.unlock(),
    });
  }

  // ---------- E + F: automatic — she collects her cream from Grace, then goes home ----------

  /** Closes the case: thank-you and result now; the patient walks to the Pharmacy and out. */
  private finishCase(): void {
    for (const kind of ["handover", "farewell"]) {
      const step = this.mission.currentStep;
      if (step?.kind === kind) this.advance(step);
    }
    if (this.mission.status !== "COMPLETED") return;
    const reward = REWARDS.caseComplete;
    this.mission.recordCompletion(reward.care);
    this.host.awardCare(reward.care);
    this.host.completeCase(reward.xp);
    const toast = this.def.collected;
    this.patient.walkTo(PHARMACY_SPOT, () => {
      if (this.mission.status !== "COMPLETED") return; // a new shift already brought a patient back
      this.host.toast(toast);
      this.host.scene.time.delayedCall(1500, () => {
        if (this.mission.status !== "COMPLETED") return;
        this.patient.walkTo(EXIT, () => {
          if (this.mission.status !== "COMPLETED") return;
          this.patient.hide();
          this.setPatientListed(false);
        });
      });
    });
    this.setPatientListed(false);
    this.showResult();
  }

  private showResult(): void {
    this.host.lock();
    const rewarded = this.def.steps.filter((s) => s.rewarded).length;
    this.result.open({
      def: this.def,
      state: this.mission.snapshot,
      xp: REWARDS.caseComplete.xp,
      maxPoints: REWARDS.caseComplete.care + rewarded * REWARDS.correctCare,
      onKeepExploring: () => {
        this.host.unlock();
        this.host.toast("🌿  Explore the clinic. End your shift at the Staff Office desk");
      },
      onEndShift: () => {
        this.host.unlock();
        this.host.endShift();
      },
    });
  }

  /** New shift: if the last patient went home, a new one arrives (Phase 2 reuses Case #001). */
  newShift(): void {
    if (this.mission.status === "COMPLETED") this.mission.reset();
    this.placePatientForState();
    this.refreshObjective();
  }

  get caseOpen(): boolean {
    return this.mission.inProgress;
  }
}
