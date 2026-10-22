import { play } from "../game/audio";
import CaseDialog from "../ui/case/CaseDialog";
import IncomingCall from "../ui/IncomingCall";
import { el } from "../ui/case/Overlay";
import { STAFF, type StaffCard } from "../data/staff";
import { clinicConfig } from "../data/gameplay";
import { t, type StringKey } from "../game/i18n";
import type { CharacterId } from "../data/assets";
import type { InteractableDef, RoomId } from "../data/rooms";

// The doctor clocks in at 7:45 and the clock runs on (slowly, see TIME.morningSpeed): a colleague
// phones to call everyone to a short meeting in the Staff Office, and the meeting hands out a
// small opening checklist. At 8:00 the clinic opens by itself. Tasks still left then stay on as
// extra work next to the patients; finishing the whole list before 8:00 earns a small bonus.
// Nothing here is scored as care.
//
//   idle → call (phone rings) → meeting (walk to the Staff Office) → prep (checklist) → ready
//   at 8:00: ready → idle (bonus) · call / meeting → prep (meeting missed) · prep stays (left over)

const STORAGE_KEY = "eczema-care-hero-morning-v1";

type Phase = "idle" | "call" | "meeting" | "prep" | "ready";

interface MorningState {
  day: number;
  phase: Phase;
  done: string[];
  /** Doctor patients queuing at the door, announced in the meeting and let in at opening. */
  queue: number;
}

interface Task {
  id: "computer" | "stock" | "fridge" | "hands";
  target: string;
  room: RoomId;
  icon: string;
}

const TASKS: Task[] = [
  { id: "computer", target: "consult-desk", room: "consult", icon: "🖥️" },
  { id: "stock", target: "storage-shelf", room: "storage", icon: "📦" },
  { id: "fridge", target: "pharmacy-counter", room: "pharmacy", icon: "🌡️" },
  { id: "hands", target: "care-sink", room: "care", icon: "🧼" },
];

const TIPS: StringKey[] = ["meet.tip1", "meet.tip2", "meet.tip3", "meet.tip4"];

const label = (task: Task) => t(`morning.task.${task.id}` as StringKey);

export interface MorningHost {
  uiRoot: HTMLElement;
  lock(): void;
  unlock(): void;
  toast(text: string): void;
  announce(text: string): void;
  setObjective(text: string | null, progress?: number): void;
  findInteractable(id: string): InteractableDef | undefined;
  /** Simple message card; `onClose` runs when it is dismissed. */
  dialog(title: string, text: string, icon: string, onClose: () => void): void;
  character(): CharacterId | undefined;
  trays(): { clean: number; total: number };
  /** The clinic has opened (8:00): checklist tasks done from now on are just extra work. */
  clinicOpen(): boolean;
}

function staff(id: string): StaffCard {
  return STAFF.find((c) => c.id === id)!;
}

export default class MorningRoutine {
  private host: MorningHost;
  private state: MorningState;
  private phone: IncomingCall;
  private talk: CaseDialog;
  /** A call, meeting or card is on screen. */
  private busy = false;

  constructor(host: MorningHost, day: number) {
    this.host = host;
    this.state = this.load(day);
    this.phone = new IncomingCall(host.uiRoot);
    this.talk = new CaseDialog(host.uiRoot);
  }

  private fresh(day: number): MorningState {
    const { min, max } = clinicConfig().morningQueue;
    const queue = day === 1 ? min : min + Math.floor(Math.random() * (max - min + 1));
    return { day, phase: "idle", done: [], queue };
  }

  private load(day: number): MorningState {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as MorningState | null;
      if (s && s.day === day && Array.isArray(s.done) && Number.isFinite(s.queue)) return s;
    } catch {
      // storage unavailable: start the morning fresh
    }
    return this.fresh(day);
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // storage unavailable: the morning lasts for this session only
    }
  }

  /** Clocked in today, with something of the morning still to do. */
  get active(): boolean {
    return this.state.phase !== "idle";
  }

  /** The whole checklist is done (the clock may hurry on to 8:00). */
  get ready(): boolean {
    return this.state.phase === "ready";
  }

  /** In a step that only makes sense before opening (the call, the meeting, ready). */
  get beforeOpeningOnly(): boolean {
    return this.state.phase === "call" || this.state.phase === "meeting" || this.state.phase === "ready";
  }

  /**
   * 8:00, the clinic opens. Returns true if the whole checklist was done in time (bonus).
   * A missed meeting still hands out the checklist; unfinished tasks stay on as extra work.
   */
  clinicOpened(): boolean {
    const phase = this.state.phase;
    if (phase === "idle") return false;
    if (phase === "ready") {
      this.set("idle");
      return true;
    }
    if (phase === "call" || phase === "meeting") this.host.toast(`📋  ${t("morning.missedMeeting")}`);
    else this.host.toast(`📋  ${t("morning.carryOver", { n: TASKS.length - this.state.done.length })}`);
    this.set("prep");
    return false;
  }

  /** Patients waiting at the door when the clinic opens. */
  get queueSize(): number {
    return this.state.queue;
  }

  /** A new day (or the same day restarted): nothing has happened yet. */
  reset(day: number): void {
    this.state = this.fresh(day);
    this.save();
  }

  private set(phase: Phase): void {
    this.state.phase = phase;
    this.save();
    this.refreshObjective();
  }

  /** Just clocked in: the phone rings a moment later. */
  begin(): void {
    this.set("call");
    window.setTimeout(() => this.ring(), 1200);
  }

  /** Back in the game with the morning under way (e.g. after a reload). */
  resume(): void {
    if (this.state.phase === "call") return void this.ring();
    this.refreshObjective();
  }

  // ---------- the phone call ----------

  private caller(): StaffCard {
    const me = this.host.character();
    const doctors = STAFF.filter((c) => c.characterId && c.characterId !== me);
    return doctors[(this.state.day - 1) % doctors.length];
  }

  /** `preview` (dev panel): show the call without changing the day. */
  private async ring(preview = false): Promise<void> {
    if (this.busy || (!preview && this.state.phase !== "call")) return;
    this.busy = true;
    this.host.lock();
    const caller = this.caller();
    const mine = STAFF.find((c) => c.characterId === this.host.character());
    const me = mine?.name.replace(/^Dr\.\s*/, "").split(" ")[0] ?? "";
    const result = await this.phone.ring(
      { name: caller.name, role: caller.role, portrait: caller.portrait },
      [t("call.line1", { name: me }), t("call.line2")]
    );
    this.busy = false;
    this.host.unlock();
    // declined: the colleague sends a text instead, the meeting still goes ahead
    if (result === "declined") this.host.toast(`💬  ${t("call.texted", { name: caller.name })}`);
    // the day may have moved on while the phone rang (clinic opened, day reset): then no meeting
    if (!preview && this.state.phase === "call") this.set("meeting");
  }

  /** Dev panel: the phone call or the meeting on its own (the day is left as it is). */
  devPreview(what: "call" | "meeting"): void {
    if (what === "call") void this.ring(true);
    else void this.meet(true);
  }

  // ---------- the meeting ----------

  private async meet(preview = false): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    this.host.lock();
    const lead = this.caller();
    const team = [lead, staff("nurul"), staff("amy"), staff("ravi"), staff("grace")];
    const trays = this.host.trays();
    const tip = t(TIPS[(this.state.day - 1) % TIPS.length]);
    const list = el("ul", "meet-list");
    for (const task of TASKS) {
      const li = el("li");
      li.append(el("span", "", task.icon), el("span", "", label(task)));
      list.append(li);
    }
    const script: [StaffCard, string, string, HTMLElement?][] = [
      [lead, t("meet.open"), t("menu.next")],
      [staff("nurul"), t("meet.nurul", { n: this.state.queue }), t("menu.next")],
      [staff("amy"), t("meet.amy", { clean: trays.clean, total: trays.total }), t("menu.next")],
      [staff("ravi"), t("meet.ravi"), t("menu.next")],
      [staff("grace"), tip, t("menu.next")],
      [lead, t("meet.tasks"), t("meet.go"), list],
    ];

    let over = false;
    const finish = () => {
      if (over) return;
      over = true;
      this.busy = false;
      this.host.unlock();
      if (preview || this.state.phase !== "meeting") return;
      // closing the meeting early still hands out the checklist
      this.set("prep");
      this.host.toast(`📋  ${t("morning.checklistToast")}`);
    };
    this.talk.begin({ title: t("meet.title"), avatar: lead.portrait }, finish);
    for (const [who, text, button, extra] of script) {
      this.talk.setHeader({ title: who.name, avatar: who.portrait, subtitle: `${t("meet.title")} · ${who.role}` });
      const row = el("div", "meet-team");
      for (const member of team) {
        const img = el("img", member === who ? "speaking" : "");
        img.src = member.portrait;
        img.alt = member.name;
        row.append(img);
      }
      const body = el("div");
      body.append(row);
      if (extra) body.append(extra);
      if (!(await this.talk.say(text, button, body))) return;
    }
    this.talk.end();
  }

  // ---------- the checklist ----------

  private taskAt(item: InteractableDef): Task | null {
    if (this.state.phase !== "prep" || this.busy) return null;
    return TASKS.find((task) => task.target === item.id && !this.state.done.includes(task.id)) ?? null;
  }

  actionLabel(item: InteractableDef): string | null {
    const task = this.taskAt(item);
    return task ? `${task.icon} ${label(task)}` : null;
  }

  /** Returns true if handled. */
  handle(item: InteractableDef): boolean {
    const task = this.taskAt(item);
    if (!task) return false;
    this.busy = true;
    this.host.lock();
    this.state.done.push(task.id);
    play("tick");
    if (task.id === "hands") play("water");
    this.save();
    this.host.dialog(`${task.icon} ${label(task)}`, t(`morning.task.${task.id}.done` as StringKey), "✅", () => {
      this.busy = false;
      this.host.unlock();
      if (this.state.done.length < TASKS.length) return this.refreshObjective();
      if (this.host.clinicOpen()) {
        // finished after opening: the work is done, no early bonus
        this.set("idle");
        this.host.toast(`✅  ${t("morning.lateDone")}`);
        return;
      }
      this.set("ready");
      this.host.announce(`✅  ${t("morning.readyAnnounce")}`);
    });
    return true;
  }

  private nextTask(): Task | undefined {
    return TASKS.find((task) => !this.state.done.includes(task.id));
  }

  /** Where the objective banner and the map point to right now. */
  target(): { item: InteractableDef | null; room: RoomId } | null {
    if (this.state.phase === "meeting") return { item: this.host.findInteractable("office-desk") ?? null, room: "office" };
    const task = this.state.phase === "prep" ? this.nextTask() : undefined;
    return task ? { item: this.host.findInteractable(task.target) ?? null, room: task.room } : null;
  }

  refreshObjective(): void {
    const done = this.state.done.length;
    const task = this.nextTask();
    switch (this.state.phase) {
      case "meeting":
        return this.host.setObjective(`${t("morning.objMeetingTag")} · ${t("morning.objMeeting")}`, 0);
      case "prep":
        return this.host.setObjective(
          `${t("morning.objPrepTag", { done, total: TASKS.length })} · ${task ? `${task.icon} ${label(task)}` : ""}`,
          done / TASKS.length
        );
      case "ready":
        return this.host.setObjective(`${t("morning.objReadyTag")} · ${t("morning.objReady")}`, 1);
      default:
        return this.host.setObjective(null);
    }
  }

  /** Every frame: walking into the Staff Office starts the meeting. */
  update(room: RoomId | null, locked: boolean): void {
    if (this.state.phase === "meeting" && room === "office" && !locked && !this.busy) void this.meet();
  }
}
