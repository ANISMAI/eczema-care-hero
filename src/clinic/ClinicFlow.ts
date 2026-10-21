import Phaser from "phaser";
import CaseNpc from "../entities/CaseNpc";
import Pathfinder from "../systems/Pathfinding";
import { speechBubble } from "../art/bubble";
import { clinicConfig } from "../data/gameplay";
import { PATIENTS, getPatient, type PatientIdentity } from "../data/patients";
import { DOCTOR_VISITS, SERVICE_VISITS, getServiceVisit, type ServiceLine, type VisitType } from "../data/visits";
import { CASE_TEMPLATES } from "../data/cases";
import { CASE_001 } from "../data/cases/case001";
import { HALLWAY, getRoomById, waitingSeat, type InteractableDef, type Point, type RoomId } from "../data/rooms";

// Phase 3: the living clinic (brief sections 5–8). One scheduler creates visitors through the
// open hours, paced and capped. Each visitor has exactly one owner at a time (explicit state):
//
//   DOCTOR:       to-reception → at-reception (Nurul registers) → to-seat → waiting (queue,
//                 patience) → with-doctor (CaseRunner owns them) → … → gone
//                 waiting → patience 0 → leaving (calm) → gone, counted as "left"
//   NPC_SERVICE:  to-reception → at-reception (Nurul) → [to-pharmacy → at-pharmacy (Grace)]
//                 → leaving → gone. Never in the doctor queue, no patience, no score.
//
// Timers run on play time (paused while a panel is open), like the clock.

const STORAGE_KEY = "eczema-care-hero-clinic-v1";
const VERSION = 1;

export type VisitorState =
  | "to-reception"
  | "at-reception"
  | "to-seat"
  | "waiting"
  | "with-doctor"
  | "to-pharmacy"
  | "at-pharmacy"
  | "leaving";

export interface Visitor {
  instanceId: string;
  identityId: string;
  visitType: VisitType;
  /** Case template id (DOCTOR) or service visit id (NPC_SERVICE). */
  templateId: string;
  state: VisitorState;
  /** Arrival order (queue order). */
  order: number;
  /** Waiting seat index (doctor patients). */
  seat: number | null;
  /** 1 → 0 while waiting in the doctor queue; null otherwise. */
  doctorPatience: number | null;
  patienceMs: number;
  /** Reception / pharmacy slot while being served. */
  slot: number | null;
  /** Play time left in the current timed state (ms). */
  timerMs: number;
  /** Next line of the service conversation to show. */
  line: number;
}

interface FlowState {
  version: number;
  day: number;
  /** Next arrival (in-game minutes since midnight). */
  nextArrivalAt: number;
  closed: boolean;
  counter: number;
  visitors: Visitor[];
  /** Completed doctor visits per identity (follow-ups need at least one). */
  history: Record<string, number>;
  /** The first arrival of day 1 is Amina with the original case (regression check). */
  firstDone: boolean;
}

/** A doctor patient as the queue panel and the call dialog see them. */
export interface QueueEntry {
  instanceId: string;
  identityId: string;
  templateId: string;
  name: string;
  portrait: string;
  reason: string;
  order: number;
  /** 0..1 */
  patience: number;
}

export interface FlowHost {
  scene: Phaser.Scene;
  pathfinder: Pathfinder;
  /** In-game minutes since midnight. */
  minutes(): number;
  toast(text: string): void;
  /** Stats for the shift summary. */
  arrived(type: VisitType): void;
  leftWaiting(): void;
  serviceDone(): void;
  rebooked(): void;
}

// ---------- places ----------

function at(room: RoomId, dx: number, dy: number): Point {
  const b = getRoomById(room).bounds;
  return { x: b.x + dx, y: b.y + dy };
}

export const ENTRANCE: Point = { x: HALLWAY.x + HALLWAY.width / 2, y: HALLWAY.y + HALLWAY.height - 40 };
/**
 * Waiting seats (feet of a seated visitor): the chairs not taken by the decorative visitors in
 * data/npcs.ts (row 1 cols 0,1,3,4 and row 4 cols 3,4), front rows first.
 */
const SEATS: Point[] = [
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  [2, 0], [0, 3], [1, 3], [2, 3],
].map(([col, row]) => waitingSeat(col, row));
/** In front of the reception counter; a third spot to queue behind if both are busy. */
const RECEPTION_SLOTS: Point[] = [at("reception", 112, 176), at("reception", 172, 176)];
const RECEPTION_LINE: Point = at("reception", 220, 236);
/** At the pharmacy counter: Grace serves slot 0; slot 1 waits for her. */
const PHARMACY_SLOTS: Point[] = [at("pharmacy", 214, 214), at("pharmacy", 262, 222)];
/** Where a doctor patient collects their approved item (CaseRunner). */
export const COLLECT_SPOT: Point = at("pharmacy", 150, 214);
/** Speech anchors over Nurul and Grace. */
const NURUL_AT: Point = at("reception", 85, 30);
const GRACE_AT: Point = at("pharmacy", 190, 54);

const CFG = clinicConfig();

const LIVE: VisitorState[] = ["to-reception", "at-reception", "to-seat", "waiting"];

function fresh(day: number): FlowState {
  return { version: VERSION, day, nextArrivalAt: CFG.firstArrivalAt, closed: false, counter: 0, visitors: [], history: {}, firstDone: false };
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export default class ClinicFlow {
  private host: FlowHost;
  private state: FlowState;
  private npcs = new Map<string, CaseNpc>();
  private saveIn = 0;

  /** No clinic save existed yet (first run of Phase 3 on this device, or after a reset). */
  readonly isNewSave: boolean;

  constructor(host: FlowHost, day: number) {
    this.host = host;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    this.isNewSave = !saved;
    this.state = this.load(day);
    this.restore();
    this.save();
  }

  // ---------- save / load ----------

  private load(day: number): FlowState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return fresh(day);
      const s = { ...fresh(day), ...JSON.parse(raw) } as FlowState;
      if (s.version !== VERSION) return fresh(day);
      if (s.day !== day) return { ...fresh(day), history: s.history ?? {}, firstDone: s.firstDone, counter: s.counter };
      return s;
    } catch {
      return fresh(day);
    }
  }

  private save(): void {
    this.saveIn = 0;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable: the clinic starts empty after a reload
    }
  }

  /**
   * After a reload: people mid-walk are settled where they were heading. Registered or seated
   * doctor patients sit back down; routine visitors and anyone leaving are simply gone.
   * Doctor patients being seen are placed by CaseRunner.
   */
  private restore(): void {
    const keep: Visitor[] = [];
    for (const v of this.state.visitors) {
      if (!getPatient(v.identityId)) continue;
      if (v.visitType === "DOCTOR" && LIVE.includes(v.state)) {
        const seat = v.seat ?? this.freeSeat(keep);
        if (seat === null) continue;
        v.seat = seat;
        v.state = "waiting";
        v.slot = null;
        v.doctorPatience ??= 1;
        keep.push(v);
        this.npcFor(v).sitAt(SEATS[seat]);
      } else if (v.state === "with-doctor") {
        keep.push(v);
        this.npcFor(v);
      } else if (v.visitType === "NPC_SERVICE" && v.state !== "leaving") {
        // a routine visit cut short by the reload counts as handled
        this.host.serviceDone();
      }
    }
    this.state.visitors = keep;
  }

  // ---------- queries ----------

  get day(): number {
    return this.state.day;
  }

  /** Doctor patients waiting to be called, in arrival order. */
  queue(): QueueEntry[] {
    return this.state.visitors
      .filter((v) => v.state === "waiting")
      .sort((a, b) => a.order - b.order)
      .map((v) => {
        const p = getPatient(v.identityId)!;
        return {
          instanceId: v.instanceId,
          identityId: v.identityId,
          templateId: v.templateId,
          name: p.name,
          portrait: p.portrait,
          reason: CASE_TEMPLATES[v.templateId]?.reason ?? "",
          order: v.order,
          patience: v.doctorPatience ?? 1,
        };
      });
  }

  /** The visitor's sprite (CaseRunner drives it while they're with the doctor). */
  npc(instanceId: string): CaseNpc | null {
    return this.npcs.get(instanceId) ?? null;
  }

  visitor(instanceId: string): Visitor | undefined {
    return this.state.visitors.find((v) => v.instanceId === instanceId);
  }

  /** Visitors present in the clinic (for tests and debugging). */
  get present(): readonly Visitor[] {
    return this.state.visitors;
  }

  // ---------- the doctor's side ----------

  /** The doctor calls the first patient in the queue: they leave the queue, patience stops. */
  callNext(): QueueEntry | null {
    const next = this.queue()[0];
    if (!next) return null;
    const v = this.visitor(next.instanceId)!;
    v.state = "with-doctor";
    v.doctorPatience = null;
    v.seat = null;
    this.save();
    return next;
  }

  /** A doctor visit finished: counts toward follow-ups for that person. */
  caseCompleted(instanceId: string): void {
    const v = this.visitor(instanceId);
    if (!v) return;
    this.state.history[v.identityId] = (this.state.history[v.identityId] ?? 0) + 1;
    this.save();
  }

  /** The visitor has walked out of the clinic (CaseRunner, or this class): remove them. */
  remove(instanceId: string): void {
    this.npcs.get(instanceId)?.destroy();
    this.npcs.delete(instanceId);
    this.state.visitors = this.state.visitors.filter((v) => v.instanceId !== instanceId);
    this.save();
  }

  // ---------- scheduler ----------

  private freeSeat(among = this.state.visitors): number | null {
    const used = new Set(among.map((v) => v.seat).filter((s) => s !== null));
    const i = SEATS.findIndex((_, k) => !used.has(k));
    return i < 0 ? null : i;
  }

  private doctorWaitingCount(): number {
    return this.state.visitors.filter((v) => v.visitType === "DOCTOR" && LIVE.includes(v.state)).length;
  }

  private serviceCount(): number {
    return this.state.visitors.filter((v) => v.visitType === "NPC_SERVICE" && v.state !== "leaving").length;
  }

  private freeIdentities(): PatientIdentity[] {
    const here = new Set(this.state.visitors.map((v) => v.identityId));
    return PATIENTS.filter((p) => !here.has(p.id));
  }

  private pickDoctorTemplate(identityId: string): string {
    const options = DOCTOR_VISITS.filter((o) => !o.returning || (this.state.history[identityId] ?? 0) > 0);
    let r = Math.random() * options.reduce((a, o) => a + o.weight, 0);
    for (const o of options) if ((r -= o.weight) < 0) return o.templateId;
    return options[0].templateId;
  }

  /** Tries to bring in one visitor now. Returns false if the clinic is at capacity. */
  private spawnOne(): boolean {
    const doctorRoom = this.doctorWaitingCount() < CFG.maxDoctorWaiting && this.freeSeat() !== null;
    const serviceRoom = this.serviceCount() < CFG.maxNpcService;
    const free = this.freeIdentities();
    if (!free.length || (!doctorRoom && !serviceRoom)) return false;

    let type: VisitType = Math.random() < CFG.doctorShare ? "DOCTOR" : "NPC_SERVICE";
    if (type === "DOCTOR" && !doctorRoom) type = "NPC_SERVICE";
    if (type === "NPC_SERVICE" && !serviceRoom) type = "DOCTOR";

    let identity = free[Math.floor(Math.random() * free.length)];
    let templateId: string;
    if (!this.state.firstDone && this.state.day === 1 && doctorRoom && free.some((p) => p.id === "amina")) {
      // regression check: the very first patient is Amina with the original case
      type = "DOCTOR";
      identity = getPatient("amina")!;
      templateId = CASE_001.id;
      this.state.firstDone = true;
    } else if (type === "DOCTOR") {
      templateId = this.pickDoctorTemplate(identity.id);
    } else {
      templateId = SERVICE_VISITS[Math.floor(Math.random() * SERVICE_VISITS.length)].id;
    }

    const v: Visitor = {
      instanceId: `v${++this.state.counter}`,
      identityId: identity.id,
      visitType: type,
      templateId,
      state: "to-reception",
      order: this.state.counter,
      seat: null,
      doctorPatience: null,
      patienceMs: rand(CFG.patienceMs.min, CFG.patienceMs.max),
      slot: null,
      timerMs: 0,
      line: 0,
    };
    this.state.visitors.push(v);
    // a doctor patient reserves a seat now, so the cap and the seats always agree
    if (type === "DOCTOR") v.seat = this.freeSeat();
    const npc = this.npcFor(v);
    npc.standAt(ENTRANCE, "up");
    this.goToReception(v);
    this.host.arrived(type);
    this.save();
    return true;
  }

  // ---------- dev tools (src/dev/DevPanel.ts) ----------

  /**
   * Dev: seats a doctor patient in the Waiting Area at once (no walk, no registration). An
   * identity already in the clinic is removed first. Returns the visitor id, or null if full.
   */
  devSeat(identityId: string, templateId: string): string | null {
    for (const v of this.state.visitors.filter((o) => o.identityId === identityId)) this.remove(v.instanceId);
    const seat = this.freeSeat();
    if (seat === null || !getPatient(identityId)) return null;
    const v: Visitor = {
      instanceId: `v${++this.state.counter}`,
      identityId,
      visitType: "DOCTOR",
      templateId,
      state: "waiting",
      order: this.state.counter,
      seat,
      doctorPatience: 1,
      patienceMs: rand(CFG.patienceMs.min, CFG.patienceMs.max),
      slot: null,
      timerMs: 0,
      line: 0,
    };
    this.state.visitors.push(v);
    this.npcFor(v).sitAt(SEATS[seat]);
    this.save();
    return v.instanceId;
  }

  /** Dev: the doctor takes this visitor (they leave the queue). */
  devTake(instanceId: string): void {
    const v = this.visitor(instanceId);
    if (!v) return;
    v.state = "with-doctor";
    v.doctorPatience = null;
    v.seat = null;
    this.save();
  }

  // ---------- per-visitor flow ----------

  private npcFor(v: Visitor): CaseNpc {
    let npc = this.npcs.get(v.instanceId);
    if (npc) return npc;
    const p = getPatient(v.identityId)!;
    const talk: InteractableDef = {
      id: `visitor-${v.instanceId}`,
      kind: "npc",
      label: p.name,
      icon: "🙂",
      x: 0,
      y: 0,
      radius: 46,
      markerLift: 52,
      markerOnlyWhenNear: true,
      dialogTitle: p.name,
      dialogText: "",
    };
    // placeholder art looks alike, so placeholder visitors wear a name tag until real art exists
    npc = new CaseNpc(this.host.scene, p.walk, p.sit, talk, this.host.pathfinder, p.tint, p.tint !== undefined ? p.name : undefined);
    this.npcs.set(v.instanceId, npc);
    return npc;
  }

  private goToReception(v: Visitor): void {
    const used = new Set(
      this.state.visitors.filter((o) => o !== v && o.slot !== null && (o.state === "at-reception" || o.state === "to-reception")).map((o) => o.slot)
    );
    const slot = RECEPTION_SLOTS.findIndex((_, i) => !used.has(i));
    const npc = this.npcFor(v);
    if (slot < 0) {
      // both spots busy: wait in line, then try again
      v.state = "to-reception";
      v.slot = null;
      npc.walkTo(RECEPTION_LINE, () => (v.timerMs = 1500));
      return;
    }
    v.slot = slot;
    npc.walkTo(RECEPTION_SLOTS[slot], () => {
      if (v.state !== "to-reception") return;
      npc.standAt(RECEPTION_SLOTS[slot], "up");
      v.state = "at-reception";
      v.timerMs = CFG.registerMs;
      v.line = 0;
      this.save();
    });
  }

  private say(line: ServiceLine, npc: CaseNpc): void {
    const s = this.host.scene;
    if (line.who === "visitor") {
      const p = npc.position;
      speechBubble(s, p.x, p.y - 62, line.text, 1600);
    } else {
      const a = line.who === "nurul" ? NURUL_AT : GRACE_AT;
      speechBubble(s, a.x, a.y, line.text, 1700, true);
    }
  }

  private receptionLines(v: Visitor): ServiceLine[] {
    if (v.visitType === "DOCTOR") {
      return [
        { who: "visitor", text: "Hi! I'd like to see the doctor, please." },
        { who: "nurul", text: "You're registered. Please have a seat 🙂" },
      ];
    }
    return getServiceVisit(v.templateId)?.reception ?? [];
  }

  private tick(v: Visitor, dt: number): void {
    const npc = this.npcs.get(v.instanceId);
    if (!npc) return;
    switch (v.state) {
      case "to-reception":
        // waiting in line for a reception spot
        if (v.timerMs > 0 && (v.timerMs -= dt) <= 0) this.goToReception(v);
        break;
      case "at-reception": {
        const lines = this.receptionLines(v);
        const elapsed = CFG.registerMs - v.timerMs;
        const due = Math.floor((elapsed / CFG.registerMs) * lines.length);
        while (v.line < lines.length && v.line <= due) this.say(lines[v.line++], npc);
        if ((v.timerMs -= dt) > 0) break;
        v.slot = null;
        if (v.visitType === "DOCTOR") this.goToSeat(v, npc);
        else if (getServiceVisit(v.templateId)?.route === "pharmacy") this.goToPharmacy(v, npc);
        else this.leave(v, npc);
        break;
      }
      case "waiting":
        v.doctorPatience = Math.max(0, (v.doctorPatience ?? 1) - dt / v.patienceMs);
        if (v.doctorPatience <= 0) {
          // calm departure: no complaint, no penalty; counted separately in the summary
          speechBubble(this.host.scene, npc.position.x, npc.position.y - 56, "I'll come back another day 🙂", 1800);
          this.host.toast(`🚶  ${getPatient(v.identityId)!.name} couldn't wait and will come back another day`);
          this.host.leftWaiting();
          this.leave(v, npc);
        }
        break;
      case "to-pharmacy":
        // second in line: step up once Grace is free
        if (v.slot === 1 && !this.state.visitors.some((o) => o !== v && (o.state === "at-pharmacy" || (o.state === "to-pharmacy" && o.slot === 0)))) {
          this.stepUp(v, npc);
        }
        break;
      case "at-pharmacy": {
        const lines = getServiceVisit(v.templateId)?.pharmacy ?? [];
        const elapsed = CFG.serviceMs - v.timerMs;
        const due = Math.floor((elapsed / CFG.serviceMs) * lines.length);
        while (v.line < lines.length && v.line <= due) this.say(lines[v.line++], npc);
        if ((v.timerMs -= dt) <= 0) this.leave(v, npc);
        break;
      }
      default:
        break;
    }
  }

  private goToSeat(v: Visitor, npc: CaseNpc): void {
    const seat = v.seat ?? this.freeSeat();
    if (seat === null) return this.leave(v, npc); // can't happen: seats are reserved on arrival
    v.seat = seat;
    v.state = "to-seat";
    npc.walkTo(SEATS[seat], () => {
      if (v.state !== "to-seat") return;
      npc.sitAt(SEATS[seat]);
      v.state = "waiting";
      v.doctorPatience = 1;
      this.save();
    });
    this.save();
  }

  private goToPharmacy(v: Visitor, npc: CaseNpc): void {
    v.state = "to-pharmacy";
    // Grace serves one person at a time; a second visitor waits a step behind
    const graceBusy = this.state.visitors.some((o) => o !== v && (o.state === "at-pharmacy" || (o.state === "to-pharmacy" && o.slot === 0)));
    v.slot = graceBusy ? 1 : 0;
    if (v.slot === 0) this.stepUp(v, npc);
    else npc.walkTo(PHARMACY_SLOTS[1], () => v.state === "to-pharmacy" && npc.standAt(PHARMACY_SLOTS[1], "up"));
    this.save();
  }

  /** Walk to Grace's counter spot, then be served. */
  private stepUp(v: Visitor, npc: CaseNpc): void {
    v.slot = 0;
    npc.walkTo(PHARMACY_SLOTS[0], () => {
      if (v.state !== "to-pharmacy") return;
      npc.standAt(PHARMACY_SLOTS[0], "up");
      v.state = "at-pharmacy";
      v.timerMs = CFG.serviceMs;
      v.line = 0;
      this.save();
    });
  }

  /** Walks out of the clinic and is removed at the door. */
  private leave(v: Visitor, npc: CaseNpc): void {
    const wasService = v.visitType === "NPC_SERVICE";
    v.state = "leaving";
    v.seat = null;
    v.slot = null;
    v.doctorPatience = null;
    npc.walkTo(ENTRANCE, () => {
      if (wasService) this.host.serviceDone();
      this.remove(v.instanceId);
    });
    this.save();
  }

  // ---------- frame ----------

  /** Every frame. `locked`: a panel is open, so timers and patience pause (like the clock). */
  update(deltaMs: number, locked: boolean): void {
    for (const npc of this.npcs.values()) npc.update(deltaMs);
    if (locked) return;
    for (const v of [...this.state.visitors]) this.tick(v, deltaMs);

    const now = this.host.minutes();
    if (!this.state.closed && now >= this.state.nextArrivalAt && now <= CFG.lastArrivalAt) {
      const ok = this.spawnOne();
      this.state.nextArrivalAt = now + (ok ? rand(CFG.arrivalEvery.min, CFG.arrivalEvery.max) : CFG.retryWhenFull);
      this.save();
    }
    this.saveIn += deltaMs;
    if (this.saveIn > 2000) this.save();
  }

  // ---------- day end ----------

  /**
   * Closing (5 PM or the Staff Office desk; the same policy either way): no more arrivals,
   * routine visitors are finished off, waiting doctor patients are rebooked for another day,
   * and everyone is cleared away. The patient with the doctor is handled by CaseRunner first.
   */
  closeDay(): void {
    this.state.closed = true;
    for (const v of [...this.state.visitors]) {
      if (v.visitType === "NPC_SERVICE" && v.state !== "leaving") this.host.serviceDone();
      else if (v.visitType === "DOCTOR" && LIVE.includes(v.state)) this.host.rebooked();
      this.remove(v.instanceId);
    }
    this.save();
  }

  /** A new day: the clinic opens again (identities and follow-up history are kept). */
  openDay(day: number): void {
    for (const id of [...this.npcs.keys()]) this.remove(id);
    this.state = { ...fresh(day), history: this.state.history, firstDone: this.state.firstDone, counter: this.state.counter };
    this.save();
  }

  /** Testing helper: bring the next arrival forward to now. */
  arriveNow(): void {
    this.state.nextArrivalAt = 0;
  }
}
