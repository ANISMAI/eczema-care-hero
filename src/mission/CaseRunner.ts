import Phaser from "phaser";
import MissionController from "./MissionController";
import CaseNpc from "../entities/CaseNpc";
import CaseDialog from "../ui/case/CaseDialog";
import Treatment from "../ui/case/Treatment";
import Announcement from "../ui/case/Announcement";
import CaseResult from "../ui/case/CaseResult";
import { CASE_001 } from "../data/cases/case001";
import { NPC_POSE_SHEETS, NPC_WALKER_SHEETS } from "../data/assets";
import { HALLWAY, getRoomById, type InteractableDef, type Point, type Rect, type RoomId } from "../data/rooms";
import { textStyle } from "../art/environment";
import { PAL } from "../art/palette";
import type { CaseDefinition, StepDef } from "./types";

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
  /** Where the player is standing (to open the treatment when the patient arrives). */
  playerRoom(): RoomId | null;
  toast(text: string): void;
  setObjective(text: string | null): void;
  npcSolids: Rect[];
}

const PATIENT_ID = "patient-amina";
const DEFAULT_LIFT = 62; // matches the scene's default bubble height

function spot(room: RoomId, dx: number, dy: number): Point {
  const b = getRoomById(room).bounds;
  return { x: b.x + dx, y: b.y + dy };
}
const SEAT = spot("waiting", 192, 132); // feet on the empty middle waiting chair
const CARE_SPOT = spot("care", 172, 186); // beside the care bed
const PHARMACY_SPOT = spot("pharmacy", 190, 210); // in front of the pharmacy counter
const EXIT = { x: HALLWAY.x + HALLWAY.width / 2, y: HALLWAY.y + HALLWAY.height - 40 };

/**
 * Runs the active patient case: the doctor calls the patient into the Care Room, then a
 * single care-session panel runs the hands-on steps. Every step change goes through the
 * MissionController, which guards against skipping or repeating steps.
 */
export default class CaseRunner {
  readonly mission = new MissionController();
  private host: CaseHost;
  private def: CaseDefinition = CASE_001;
  private patient: CaseNpc;
  private patientListed = false;
  private questTag: Phaser.GameObjects.Container;
  private dialog: CaseDialog;
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
    this.questTag = this.makeQuestTag();
    this.dialog = new CaseDialog(host.uiRoot);
    this.treatment = new Treatment(host.uiRoot);
    this.announcement = new Announcement(host.uiRoot);
    this.result = new CaseResult(host.uiRoot);

    this.mission.onChange(() => this.refreshObjective());
    this.placePatientForState();
    this.refreshObjective();
  }

  // ---------- world ----------

  /** Puts the patient where the saved state says she should be (load and replay). */
  private placePatientForState(): void {
    const m = this.mission;
    const step = m.currentStep;
    if (m.snapshot.status === "completed" || step?.kind === "handoff") {
      this.patient.hide();
      this.setPatientListed(false);
      return;
    }
    if (!m.isActive || step?.kind === "call") this.patient.sitAt(SEAT);
    else this.patient.standAt(CARE_SPOT, "down");
    this.setPatientListed(true);
  }

  private setPatientListed(on: boolean): void {
    if (on === this.patientListed) return;
    this.patientListed = on;
    if (on) this.host.addInteractable(this.patient.talk);
    else this.host.removeInteractable(PATIENT_ID);
  }

  private makeQuestTag(): Phaser.GameObjects.Container {
    const s = this.host.scene;
    const bg = s.add.graphics();
    bg.fillStyle(PAL.shadow, 0.3);
    bg.fillRoundedRect(-27, -9, 54, 21, 10);
    bg.fillStyle(0xf0679e, 1);
    bg.fillRoundedRect(-27, -11, 54, 21, 10);
    bg.lineStyle(2, 0xffffff, 1);
    bg.strokeRoundedRect(-27, -11, 54, 21, 10);
    bg.fillStyle(0xf0679e, 1);
    bg.fillTriangle(-6, 9, 6, 9, 0, 16);
    const label = s.add.text(0, -1, "NEXT", textStyle(10, "#ffffff", "900")).setOrigin(0.5);
    const bob = s.add.container(0, 0, [bg, label]);
    s.tweens.add({ targets: bob, y: -6, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    return s.add.container(0, 0, [bob]).setDepth(6100).setVisible(false);
  }

  /** The step to point at: the current one, or "call" when no case is running yet. */
  private currentOrStart(): StepDef | null {
    if (this.mission.isActive) return this.mission.currentStep;
    return this.def.steps[0];
  }

  /** The interactable the player should go to next, if it is reachable right now. */
  questTarget(): InteractableDef | null {
    if (this.patient.isWalking) return null;
    const step = this.currentOrStart();
    if (!step) return null;
    for (const id of step.targets) {
      if (id === PATIENT_ID && !this.patientListed) continue;
      const item = this.host.findInteractable(id);
      if (item) return item;
    }
    return null;
  }

  questRoom(): RoomId | null {
    const step = this.currentOrStart();
    return step && step.targets.length ? step.room : null;
  }

  update(deltaMs: number): void {
    this.patient.update(deltaMs);
    const target = this.questTarget();
    this.questTag.setVisible(!!target);
    if (target) this.questTag.setPosition(target.x, target.y - (target.markerLift ?? DEFAULT_LIFT) - 2);
  }

  private refreshObjective(): void {
    const step = this.currentOrStart();
    if (this.mission.snapshot.status === "completed" && !this.mission.isActive) {
      this.host.setObjective(null);
      return;
    }
    if (step?.kind === "inspect" && this.patient.isWalking) {
      this.host.setObjective(`${this.def.title} · Amina is on her way…`);
      return;
    }
    this.host.setObjective(step && step.targets.length ? `${this.def.title} · ${step.objective}` : null);
  }

  // ---------- interactions ----------

  actionLabel(item: InteractableDef): string | null {
    const step = this.currentOrStart();
    if (item.id === "care-bed" && (!this.mission.isActive || step?.kind === "call")) {
      return this.mission.snapshot.status === "completed" ? "📢 Call patient (replay)" : "📢 Call patient";
    }
    if (item.id === PATIENT_ID && this.mission.isActive && step && step.kind !== "call" && !this.patient.isWalking) {
      return this.mission.isDone("inspect") ? "Continue treatment" : "Start treatment";
    }
    return null;
  }

  /** Handles an interaction if the case cares about it; false = use the item's normal line. */
  handle(item: InteractableDef): boolean {
    const step = this.mission.currentStep;
    if (item.id === "care-bed" && (!this.mission.isActive || step?.kind === "call")) {
      this.callPatient();
      return true;
    }
    if (item.id !== PATIENT_ID) return false;
    if (this.patient.isWalking) {
      this.host.toast("🚶  Amina is on her way");
      return true;
    }
    if (!this.mission.isActive || step?.kind === "call") {
      this.quickLine(this.def.patient.name, this.def.patient.portrait, "I'm waiting to be called 🙂");
      return true;
    }
    this.openSession();
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

  /** "Call patient": PA announcement, then the patient walks into the Care Room. */
  private callPatient(): void {
    if (this.patient.isWalking) return;
    if (!this.mission.isActive) {
      this.mission.start(this.def.id);
      this.patient.sitAt(SEAT);
      this.setPatientListed(true);
    }
    if (!this.mission.complete("call")) return;
    this.announcement.show(this.def.announcement);
    this.patient.walkTo(
      CARE_SPOT,
      () => {
        this.patient.standAt(CARE_SPOT, "down");
        this.refreshObjective();
        // Dentist-Hero style: straight into the treatment if the doctor is in the Care Room
        if (this.host.playerRoom() === "care") this.openSession();
        else this.host.toast("🙂  Amina is in the Care Room");
      },
      SEAT
    );
    this.refreshObjective();
  }

  // ---------- treatment ----------

  private openSession(): void {
    if (this.treatment.isOpen || !this.mission.isActive) return;
    this.host.lock();
    const m = this.mission;
    this.treatment.open({
      def: this.def,
      current: () => (m.currentStep?.kind === "handoff" ? null : m.currentStep),
      isDone: (id) => m.isDone(id),
      progressOf: (id) => m.progressOf(id),
      addProgress: (id, v) => m.addProgress(id, v),
      penalize: (id) => m.penalize(id),
      complete: (id) => {
        if (m.complete(id) && m.currentStep?.kind === "handoff") {
          // short pause so the patient's smile is seen, then the result
          this.host.scene.time.delayedCall(900, () => this.finishCase());
        }
      },
      onClose: () => this.host.unlock(),
    });
  }

  /** After the last activity: the patient collects her items at the Pharmacy, then leaves. */
  private finishCase(): void {
    this.treatment.close();
    if (!this.mission.complete("handoff")) return;
    this.patient.walkTo(PHARMACY_SPOT, () => {
      if (this.mission.isActive) return; // a replay already brought her back
      this.host.toast("💊  Grace checked Amina's items ✓");
      this.patient.walkTo(EXIT, () => {
        if (this.mission.isActive) return;
        this.patient.hide();
        this.setPatientListed(false);
      });
    });
    this.showResult();
  }

  private showResult(): void {
    this.host.lock();
    this.result.open({
      def: this.def,
      state: this.mission.snapshot,
      onReturn: () => this.host.unlock(),
      onReplay: () => {
        this.host.unlock();
        this.replay();
      },
    });
  }

  /** Replay: fresh case data (best score kept); the patient is back in the Waiting Area. */
  replay(): void {
    this.mission.start(this.def.id);
    this.placePatientForState();
    this.host.toast("🔁  Case 001 restarted: call Amina from the Care Room");
  }
}
