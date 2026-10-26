import Phaser from "phaser";
import Ambience from "../systems/Ambience";
import { play, titleMusic } from "../game/audio";
import Player from "../entities/Player";
import MovementSystem from "../systems/Movement";
import InteractionSystem from "../systems/Interaction";
import NavigationSystem from "../systems/Navigation";
import HUD from "../ui/HUD";
import MiniMap from "../ui/MiniMap";
import FullMap from "../ui/FullMap";
import Dialog from "../ui/Dialog";
import CharacterSelect from "../ui/CharacterSelect";
import StaffDirectory from "../ui/StaffDirectory";
import ProfileCard from "../ui/ProfileCard";
import CaseRunner from "../mission/CaseRunner";
import GameClock from "../systems/GameClock";
import Amenities from "../systems/Amenities";
import MorningRoutine from "../systems/MorningRoutine";
import PatientHistory from "../systems/PatientHistory";
import { asksFollowUp, pickScenario, visitFlavor } from "../data/phase5/select";
import { personalityOf } from "../data/phase5/personalities";
import { nextOutfit } from "../systems/Outfits";
import Announcement from "../ui/case/Announcement";
import CaseDialog from "../ui/case/CaseDialog";
import ShiftSummary from "../ui/ShiftSummary";
import ShiftBriefing from "../ui/ShiftBriefing";
import { playClockIn } from "../ui/ClockIn";
import type { DevApi } from "../dev/DevPanel";
import { PATIENTS } from "../data/patients";
import { CASE_TEMPLATES } from "../data/cases";
import { EVENTS } from "../events/registry";
import { STAFF } from "../data/staff";
import Progress from "../systems/Progress";
import EventDirector from "../events/EventDirector";
import { eventBus } from "../game/EventBus";
import { prayerReminders, resetAllProgress, reloadLanguage, RESUME_SETTINGS_KEY } from "../game/settings";
import { exitToHost } from "../game/host";
import CareTrays from "../systems/CareTrays";
import ClinicFlow from "../clinic/ClinicFlow";
import QueuePanel from "../ui/QueuePanel";
import Pathfinder from "../systems/Pathfinding";
import { amyBusyChance, REWARDS, TIME, TRAYS } from "../data/gameplay";
import { runTap, stallSequence } from "../art/amenityFx";
import type { StaffCard } from "../data/staff";
import { CHARACTERS, getCharacter, type CharacterId, type PlayableCharacter } from "../data/assets";
import {
  ROOMS,
  HALLWAYS,
  HALLWAY_FURNITURE,
  WORLD_BOUNDS,
  getRoomWalls,
  getHallwayWalls,
  getAllWalls,
  getFurnitureSolids,
  findRoomAt,
  isWalkable,
  type RoomId,
  type InteractableDef,
  type Rect,
} from "../data/rooms";
import { loadSave, saveGame, SAVE_VERSION } from "../data/save";
import { RENDER_SCALE, viewZoom } from "../game/display";
import { createFurniture } from "../art/furniture";
import { PoseNpc, WalkerNpc } from "../entities/Npc";
import { NPC_INTERACTABLES, POSE_NPCS, WALKER_NPCS } from "../data/npcs";
import {
  HALLWAY_FLOOR,
  HALLWAY_WALL,
  createMarker,
  drawDoor,
  drawFloor,
  drawGarden,
  drawHallwayRunner,
  drawRoomPlaque,
  drawWall,
  type Marker,
} from "../art/environment";
import { t } from "../game/i18n";

/** Floating "!" / "…" bubbles over interactables. Off by design: players explore freely. */
const SHOW_INTERACT_BUBBLES = false;
const MARKER_LIFT = 62; // default height of an interaction bubble above its interactable
/** Hoverboard on or off, remembered on this device (not part of the game save). */
const HOVERBOARD_KEY = "eczema-care-hero-hoverboard";
function loadHoverboard(): boolean {
  try {
    return localStorage.getItem(HOVERBOARD_KEY) === "1";
  } catch {
    return false;
  }
}
/** The Staff Office desk is where the player ends a shift. */
const SHIFT_DESK = "office-desk";

export default class ClinicScene extends Phaser.Scene {
  private soundscape = new Ambience();
  private player!: Player;
  private movement!: MovementSystem;
  private interaction!: InteractionSystem;
  private navigation!: NavigationSystem;
  private hud!: HUD;
  private miniMap!: MiniMap;
  private fullMap!: FullMap;
  private dialog!: Dialog;
  private characterSelect!: CharacterSelect;
  private staffDirectory!: StaffDirectory;
  private profile!: ProfileCard;
  private caseRunner!: CaseRunner;
  private clock!: GameClock;
  private amenities!: Amenities;
  /** Before opening: the phone call, the Staff Office meeting and the opening checklist. */
  private morning!: MorningRoutine;
  /** Task card texts: the patient case's, and the morning checklist's (shown when the case has none). */
  private caseObjective: [string | null, number] = [null, 0];
  private morningObjective: [string | null, number] = [null, 0];
  private announcer!: Announcement;
  private progress = new Progress();
  /** Phase 5: who has visited before (today's visits are committed when the shift completes). */
  private history = new PatientHistory();
  private clinicEvents!: EventDirector;
  private flow!: ClinicFlow;
  private queuePanel!: QueuePanel;
  private queueKey = "";
  private trays!: CareTrays;
  private shiftSummary!: ShiftSummary;
  private briefing!: ShiftBriefing;
  /** The briefing card opened the doctor picker: go back to the card afterwards. */
  private backToBriefing = false;
  private shiftDialog!: CaseDialog;
  /** The clock reached 5:00 PM while a panel was open; end the shift once it closes. */
  private shiftEndPending = false;
  /** The title screen is up: overview camera, game paused. */
  private onTitle = true;
  /** A language reload returns to the paused profile settings, bypassing the opening. */
  private resumeSettings = false;
  /** Dev panel: how fast the clock, visitors and events run. */
  private devSpeed = 1;
  private character: PlayableCharacter | undefined;

  private markers = new Map<string, Marker>();
  private poseNpcs: PoseNpc[] = [];
  private walkers: WalkerNpc[] = [];
  private interactables: InteractableDef[] = [];
  /** Runtime interactables whose markers follow them each frame. */
  private dynamic = new Set<InteractableDef>();
  private currentRoomId: RoomId = "reception";
  private nearestInteractable: InteractableDef | null = null;
  private inputLocked = false;
  /** Amenities keep controls locked while the doctor walks to the sink, mat or cubicle. */
  private scriptedWalking = false;

  constructor() {
    super("ClinicScene");
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.soundscape.stop());
    try {
      this.resumeSettings = sessionStorage.getItem(RESUME_SETTINGS_KEY) === "1";
      sessionStorage.removeItem(RESUME_SETTINGS_KEY);
    } catch {
      // No automatic return when session storage is unavailable.
    }
    const save = loadSave();
    this.currentRoomId = save.currentRoomId;

    this.physics.world.setBounds(0, 0, WORLD_BOUNDS.width, WORLD_BOUNDS.height);
    this.drawWorld();
    const solids = this.buildColliders();
    this.checkLayout();

    // Until a character is chosen, the first one stands in behind the select screen.
    this.character = getCharacter(save.settings.character);
    this.player = new Player(this, save.playerX, save.playerY, (this.character ?? CHARACTERS[0]).sheet);
    this.physics.add.collider(this.player, solids);

    const cam = this.cameras.main;
    cam.setZoom(this.playZoom);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(false);
    this.fitCamera();
    this.showOverview(); // title screen first: the whole clinic from above
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this));

    this.movement = new MovementSystem(this, this.player);
    this.interaction = new InteractionSystem(this.interactables);
    this.navigation = new NavigationSystem(this, this.player, this.npcSolids(), () => this.hud.showRoomToast(t("toast.noPath")));

    this.buildUI();
    // developer panel: `npm run dev` only (the whole module is left out of production builds)
    if (import.meta.env.DEV) {
      void import("../dev/DevPanel").then((m) => new m.default(document.getElementById("game-container")!, this.devApi()));
    }
    this.hud.showRoomToast(this.roomLabel(findRoomAt(this.player.x, this.player.y)?.id ?? null));

    this.time.addEvent({ delay: 2000, loop: true, callback: () => this.persist() });
    window.addEventListener("beforeunload", () => this.persist());

    // Title screen (ui/TitleScreen.ts): the game waits paused, HUD hidden, until Play
    this.inputLocked = true;
    this.hud.root.classList.add("hud-off");
    const off = eventBus.on("title-play", () => {
      off();
      this.leaveTitle();
    });
    eventBus.emit("clinic-ready");
  }

  /** HUD hoverboard button (or R): hop on or off. */
  private toggleHoverboard(): void {
    if (this.inputLocked) return;
    this.setHoverboard(!this.player.riding);
    this.hud.showRoomToast(t(this.player.riding ? "hoverboard.on" : "hoverboard.off"));
  }

  private setHoverboard(on: boolean): void {
    this.player.setRiding(on);
    this.hud.setHoverboard(on);
    try {
      localStorage.setItem(HOVERBOARD_KEY, on ? "1" : "0");
    } catch {
      // storage unavailable: the choice lasts for this session only
    }
  }

  /** Camera zoom while playing: sharp on high-DPI screens, and closer in on tablets. */
  private get playZoom(): number {
    return RENDER_SCALE * viewZoom();
  }

  /**
   * Matches the camera to the (possibly rotated) screen. If the screen shows more than the
   * whole clinic along one axis — e.g. a wide landscape tablet — the bounds grow evenly on both
   * sides so the clinic stays centred instead of sticking to one edge.
   */
  private fitCamera(): void {
    if (this.onTitle) return this.showOverview();
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    // closer in on big screens (tablets), the same as before on phones; follows rotation too
    cam.setZoom(this.playZoom);
    const viewW = this.scale.width / this.playZoom;
    const viewH = this.scale.height / this.playZoom;
    const padX = Math.max(0, (viewW - WORLD_BOUNDS.width) / 2);
    const padY = Math.max(0, (viewH - WORLD_BOUNDS.height) / 2);
    cam.setBounds(-padX, -padY, WORLD_BOUNDS.width + padX * 2, WORLD_BOUNDS.height + padY * 2);
  }

  /**
   * Behind the title, and right after "stepping inside": the clinic seen from above. Portrait:
   * the whole building. Landscape: the tall building would be tiny, so it is shown bigger, from
   * the front entrance (where we just came in).
   */
  private showOverview(): void {
    const cam = this.cameras.main;
    cam.stopFollow();
    cam.removeBounds();
    cam.setSize(this.scale.width, this.scale.height);
    const fitAll = Math.min(this.scale.width / WORLD_BOUNDS.width, this.scale.height / WORLD_BOUNDS.height) * 0.94;
    if (this.scale.width <= this.scale.height) {
      cam.setZoom(fitAll);
      cam.centerOn(WORLD_BOUNDS.width / 2, WORLD_BOUNDS.height / 2);
      return;
    }
    const zoom = Math.max(fitAll, (this.scale.width / WORLD_BOUNDS.width) * 0.62);
    cam.setZoom(zoom);
    const half = this.scale.height / zoom / 2;
    cam.centerOn(WORLD_BOUNDS.width / 2, Math.max(WORLD_BOUNDS.height - half, WORLD_BOUNDS.height / 2));
  }

  /** Play pressed: zoom down from the overview to the doctor, then hand over control. */
  private leaveTitle(): void {
    const cam = this.cameras.main;
    const ms = this.resumeSettings || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1300;
    const start = () => {
      this.onTitle = false;
      cam.startFollow(this.player, true, 0.12, 0.12);
      this.fitCamera();
      this.hud.root.classList.remove("hud-off");
      this.inputLocked = false;
      this.hud.showRoomToast(this.roomLabel(findRoomAt(this.player.x, this.player.y)?.id ?? null));
      if (this.resumeSettings && this.character) {
        this.resumeSettings = false;
        this.openProfile();
        this.profile.openSettings();
        return;
      }
      // first launch: choose a doctor; refreshed during the day's summary: show it again;
      // otherwise the day's briefing card (the clinic opens when the player starts the shift)
      if (!this.character) this.openCharacterSelect(true);
      else if (this.progress.snapshot.shiftEnded) this.showShiftSummary();
      else if (this.preShift && this.morning.active) this.morning.resume(); // already clocked in today
      else if (this.preShift) this.showBriefing();
    };
    if (!ms) {
      cam.setZoom(this.playZoom);
      return start();
    }
    // a moment to take in the whole clinic after stepping inside, then down to the doctor
    this.time.delayedCall(900, () => {
      cam.zoomTo(this.playZoom, ms, "Sine.easeInOut");
      cam.pan(this.player.x, this.player.y, ms, "Sine.easeInOut", false, (_c, progress) => {
        if (progress >= 1) start();
      });
    });
  }

    // ---------- World ----------

  private drawWorld(): void {
    drawGarden(this);

    for (const hall of HALLWAYS) drawFloor(this, hall, HALLWAY_FLOOR);
    drawHallwayRunner(this);
    for (const wall of getHallwayWalls()) drawWall(this, wall, HALLWAY_WALL);
    for (const item of HALLWAY_FURNITURE) createFurniture(this, item);

    for (const room of ROOMS) {
      drawFloor(this, room.bounds, room.floor);
      for (const wall of getRoomWalls(room)) drawWall(this, wall, room.color);
      drawDoor(this, room);
      drawRoomPlaque(this, room);
      for (const item of room.furniture) createFurniture(this, item);

      this.interactables.push(...room.interactables);
    }

    this.poseNpcs = POSE_NPCS.map((def) => new PoseNpc(this, def));
    this.walkers = WALKER_NPCS.map((def) => new WalkerNpc(this, def));
    // A walker whose sprite failed to load is left out entirely, conversation included.
    const hidden = new Set(WALKER_NPCS.filter((_, i) => !this.walkers[i].visible).map((d) => d.talk.id));
    this.interactables.push(...NPC_INTERACTABLES.filter((item) => !hidden.has(item.id)));

    for (const item of this.interactables) {
      const marker = createMarker(
        this,
        item.x,
        item.y - (item.markerLift ?? MARKER_LIFT),
        item.kind === "npc",
        item.markerOnlyWhenNear
      );
      this.markers.set(item.id, marker);
    }
  }

  /** Solid boxes around standing NPCs (also avoided by auto-walk). */
  private npcSolids(): Rect[] {
    return POSE_NPCS.flatMap((npc) => {
      if (!npc.solid) return [];
      const { w, h } = npc.solid;
      return [{ x: npc.feet.x - w / 2, y: npc.feet.y - h, width: w, height: h }];
    });
  }

  private buildColliders(): Phaser.Physics.Arcade.StaticGroup {
    const group = this.physics.add.staticGroup();
    const addZone = (r: Rect) => {
      if (r.width <= 0 || r.height <= 0) return;
      const zone = this.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height);
      this.physics.add.existing(zone, true);
      group.add(zone);
    };
    getAllWalls().forEach(addZone);
    getFurnitureSolids().forEach(addZone);
    this.npcSolids().forEach(addZone);
    return group;
  }

  /** Dev guard: warns if a layout edit puts a spawn point inside a wall or furniture. */
  private checkLayout(): void {
    for (const room of ROOMS) {
      if (!isWalkable(room.spawn.x, room.spawn.y)) {
        console.warn(`[layout] spawn for "${room.id}" is blocked — adjust it in data/rooms.ts`);
      }
    }
  }

  // ---------- UI ----------

  private buildUI(): void {
    const uiRoot = document.getElementById("ui-root")!;

    this.hud = new HUD(uiRoot, {
      onJoystickMove: (x, y) => this.movement.setJoystickVector(x, y),
      onInteract: () => this.handleInteract(),
      onMiniMapTap: () => this.openFullMap(),
      onAvatarTap: () => this.openProfile(),
      onStaffTap: () => this.openStaffDirectory(),
      onObjectiveTap: () => this.goToObjective(),
      onStartShiftTap: () => this.showBriefing(),
      onHoverboardTap: () => this.toggleHoverboard(),
    });
    this.hud.setAvatar(this.character);
    this.miniMap = new MiniMap(this.hud.miniMapMount);
    this.fullMap = new FullMap(uiRoot, {
      onGoHere: (roomId) => this.handleGoHere(roomId),
      onClose: () => (this.inputLocked = false),
    });
    this.dialog = new Dialog(uiRoot);
    this.shiftDialog = new CaseDialog(uiRoot);
    this.shiftSummary = new ShiftSummary(uiRoot);
    this.briefing = new ShiftBriefing(uiRoot);
    this.characterSelect = new CharacterSelect(
      uiRoot,
      (id) => this.chooseCharacter(id),
      () => {
        this.inputLocked = false;
        this.returnToBriefing();
      }
    );
    this.staffDirectory = new StaffDirectory(uiRoot, {
      onFind: (card) => this.findStaff(card),
      onClose: () => (this.inputLocked = false),
    });
    this.profile = new ProfileCard(uiRoot, {
      // stays locked: the character picker takes over and unlocks when it closes
      onChangeCharacter: () => this.characterSelect.open(this.character?.id, false),
      onExit: () => this.exitToMenu(),
      onLanguageChange: (language) => {
        this.persist();
        this.clock.save();
        reloadLanguage(language, true);
      },
      onClose: () => (this.inputLocked = false),
    });
    // Phase 3: visitors arrive all day; the doctor queue and Nurul / Grace's routine visits
    this.flow = new ClinicFlow(
      {
        scene: this,
        pathfinder: new Pathfinder(this.npcSolids()),
        minutes: () => this.clock.minutesOfDay,
        toast: (text) => this.hud.showRoomToast(text),
        arrived: (type) => this.progress.countVisit(type === "DOCTOR" ? "doctorArrivals" : "serviceArrivals"),
        leftWaiting: () => this.progress.countVisit("doctorLeft"),
        serviceDone: () => this.progress.countVisit("serviceServed"),
        rebooked: () => this.progress.countVisit("doctorRebooked"),
        pickVisit: (identityId) => pickScenario(identityId, this.history.get(identityId)),
        // a returning patient comes in different clothes than last time
        pickOutfit: (identityId) => nextOutfit(identityId, this.history.get(identityId)?.lastOutfit),
      },
      this.progress.shift
    );
    this.queuePanel = new QueuePanel(this.hud.queueMount, () => this.goToObjective());
    this.caseRunner = new CaseRunner({
      scene: this,
      uiRoot,
      lock: () => this.lockInput(),
      unlock: () => (this.inputLocked = false),
      addInteractable: (item) => this.addInteractable(item),
      removeInteractable: (id) => this.removeInteractable(id),
      findInteractable: (id) => this.interactables.find((i) => i.id === id),
      toast: (text) => this.hud.showRoomToast(text),
      setObjective: (text, progress) => {
        this.caseObjective = [text, progress ?? 0];
        this.showObjective();
      },
      nextInQueue: () => this.flow.queue()[0] ?? null,
      callNext: () => this.flow.callNext(),
      patientNpc: (id) => this.flow.npc(id),
      caseCompleted: (id) => this.flow.caseCompleted(id),
      visitorGone: (id) => this.flow.remove(id),
      visitFlavor: (identityId, templateId) => {
        const f = visitFlavor(identityId, CASE_TEMPLATES[templateId], this.history.get(identityId), this.doctorRef());
        const greetReaction = personalityOf(identityId)?.greetReaction ?? null;
        return { greeting: f.greeting, greetReaction, intro: f.intro, serious: f.serious, intensity: f.intensity };
      },
      visitDone: (identityId, templateId) => {
        const template = CASE_TEMPLATES[templateId];
        const doctor = this.doctorRef();
        // the same (deterministic) lines that were shown, so the next visit picks different ones
        const f = visitFlavor(identityId, template, this.history.get(identityId), doctor);
        this.history.record(identityId, {
          scenarioId: templateId,
          planKey: template.planKey ?? templateId,
          followUp: asksFollowUp(template),
          shift: this.progress.shift,
          doctorId: doctor.id,
          greeting: f.greetingKey,
          introIndex: f.introIndex,
          outfit: this.flow.present.find((v) => v.identityId === identityId)?.outfit ?? 0,
        });
      },
      awardCare: (points) => this.progress.addCare(points),
      completeCase: (xp) => this.progress.completeCase(xp),
      onStatus: (status) => this.clinicEvents.trigger(status, this.progress.shift),
      trayReady: () => this.trays.clean > 0,
      trayStatus: () => ({ clean: this.trays.clean, total: TRAYS.count }),
      recordVisit: (v) => this.progress.recordVisit(v),
      noTrayLine: () => this.trays.noTrayMessage(),
      useTray: () => {
        this.trays.use();
        // usually Nurse Amy cleans it; sometimes she's busy and asks the doctor
        if (Math.random() < amyBusyChance()) this.clinicEvents.offer("tray-cleaning");
      },
    });
    this.clinicEvents = new EventDirector(
      {
        scene: this,
        uiRoot,
        hudRoot: this.hud.stack,
        lock: () => this.lockInput(),
        unlock: () => (this.inputLocked = false),
        toast: (text) => this.hud.showRoomToast(text),
        findInteractable: (id) => this.interactables.find((i) => i.id === id),
        walkTo: (target, room) => {
          if (this.inputLocked) return;
          if (target) this.walkToItem(target, room, () => this.persist());
          else this.navigation.walkToRoom(room, () => this.persist());
          this.hud.showRoomToast(`🚶  ${t("toast.heading", { place: this.roomLabel(room).replace(/^\S+\s+/, "") })}`);
        },
        reward: (coins, xp) => this.progress.addEventReward(coins, xp),
        minutes: () => this.clock.minutesOfDay,
        shiftActive: () => !this.onTitle && this.progress.snapshot.shiftStarted && !this.progress.snapshot.shiftEnded,
        canNotify: () => !this.inputLocked && !this.caseRunner.caseOpen,
        eligible: (id) => id !== "tray-cleaning" || this.trays.dirty > 0,
        resolved: (id) => {
          if (id === "tray-cleaning") this.trays.cleanOne();
        },
      },
      this.progress.shift
    );
    this.trays = new CareTrays({
      scene: this,
      uiRoot,
      lock: () => this.lockInput(),
      unlock: () => (this.inputLocked = false),
      toast: (text) => this.hud.showRoomToast(text),
      findInteractable: (id) => this.interactables.find((i) => i.id === id),
      amyBusy: () => this.clinicEvents.isActive("tray-cleaning"),
    });
    this.progress.onChange(() => this.hud.setStats(this.progress.level, this.progress.snapshot.coins));
    this.announcer = new Announcement(uiRoot);
    this.clock = new GameClock({
      // only if the player asked for prayer-time reminders (Settings / doctor picker)
      onPrayerTime: (p) => prayerReminders() && this.announcer.show(p.message, 4500, true),
      // 5:00 PM: the shift ends as soon as no panel is open
      onShiftOver: () => (this.shiftEndPending = true),
    });
    // First run of the living clinic on an older save: the saved clock may be late in the day
    // (after the last arrival), so start this day fresh at 8:00 AM for a full day of patients.
    if (this.flow.isNewSave && !this.progress.snapshot.shiftEnded) this.clock.reset();
    this.morning = new MorningRoutine(
      {
        uiRoot,
        lock: () => this.lockInput(),
        unlock: () => (this.inputLocked = false),
        toast: (text) => this.hud.showRoomToast(text),
        announce: (text) => this.announcer.show(text, 4500),
        setObjective: (text, progress) => {
          this.morningObjective = [text, progress ?? 0];
          this.showObjective();
        },
        findInteractable: (id) => this.interactables.find((i) => i.id === id),
        dialog: (title, text, icon, onClose) => this.dialog.open(title, text, icon, onClose),
        character: () => this.character?.id,
        trays: () => ({ clean: this.trays.clean, total: TRAYS.count }),
        clinicOpen: () => !this.preShift,
      },
      this.progress.shift
    );
    // Leaving a shift starts the day over; a settings-language reload continues it instead.
    if (this.progress.shiftUnfinished && !this.resumeSettings) this.restartDay();
    if (!this.resumeSettings) {
      if (this.preShift) this.clock.setBeforeOpening();
      else this.morning.reset(this.progress.shift);
    }
    this.amenities = new Amenities({
      uiRoot,
      canPray: () => prayerReminders(),
      lock: () => this.lockInput(),
      unlock: () => (this.inputLocked = false),
      toast: (text) => this.hud.showRoomToast(text),
      setPlayerVisible: (v) => this.player.setVisible(v),
      walkTo: (p) => this.walkPlayerTo(p),
      playStall: async (enter) => {
        const stall = this.interactables.find((i) => i.id === "toilet-stall")!;
        const bottom = { x: stall.x, y: stall.y + (stall.area?.h ?? 0) / 2 };
        const outside = { x: stall.x, y: bottom.y + 26 };
        if (enter && !(await this.walkPlayerTo(outside))) return false;
        await stallSequence(this, this.player, bottom, outside, enter);
        return true;
      },
      playTap: async (ms) => {
        const sink = this.interactables.find((i) => i.id === "toilet-sink")!;
        if (!(await this.walkPlayerTo({ x: sink.x - 6, y: sink.y + (sink.area?.h ?? 0) / 2 + 22 }))) return false;
        this.player.face("up"); // facing the sink
        play("water");
        await runTap(this, { x: sink.x, y: sink.y + (sink.area?.h ?? 0) / 2 }, ms);
        return true;
      },
      alert: (title, text, icon) => {
        this.lockInput();
        this.dialog.open(title, text, icon, () => (this.inputLocked = false));
      },
      showPrayPose: (at) => {
        const sheet = (this.character ?? CHARACTERS[0]).pray;
        if (!sheet || !this.textures.exists(sheet.key)) return null;
        const sprite = this.add
          .sprite(at.x, at.y, sheet.key, 0)
          .setOrigin(0.5, (sheet.frameHeight - sheet.padding) / sheet.frameHeight)
          .setScale(sheet.displayHeight / sheet.contentHeight)
          .setDepth(at.y + 5);
        return {
          setFrame: (f) => sprite.setFrame(f),
          stop: () => sprite.destroy(),
        };
      },
    });
    window.addEventListener("beforeunload", () => this.clock.save());

    this.input.keyboard?.on("keydown-E", () => this.handleInteract());
    this.input.keyboard?.on("keydown-SPACE", () => this.handleInteract());
    this.input.keyboard?.on("keydown-M", () => this.openFullMap());
    this.input.keyboard?.on("keydown-R", () => this.toggleHoverboard());
    // the hoverboard: remembered on this device
    this.setHoverboard(loadHoverboard());
  }

  private handleInteract(): void {
    if (this.inputLocked || !this.nearestInteractable) return;
    const item = this.nearestInteractable;
    this.navigation.cancel();
    // the patient case's current step decides first, then an optional event at this spot,
    // then a hint for a later case step; otherwise the item's own line. The morning checklist
    // goes first before opening, and after the patient case once the clinic is open.
    if (this.preShift && this.morning.handle(item)) return;
    if (this.amenities.handle(item)) return;
    if (this.caseRunner.handle(item)) return;
    if (this.morning.handle(item)) return;
    if (this.clinicEvents.handle(item)) return;
    if (this.trays.handle(item)) return;
    if (item.id === SHIFT_DESK && !this.preShift) return this.confirmEndShift();
    if (this.caseRunner.hint(item)) return;
    this.lockInput();
    this.dialog.open(item.dialogTitle, item.dialogText, item.icon, () => {
      this.inputLocked = false;
    });
  }

  private actionLabel(item: InteractableDef): string | null {
    return (
      (this.preShift ? this.morning.actionLabel(item) : null) ??
      this.amenities.actionLabel(item) ??
      this.caseRunner.actionLabel(item) ??
      this.morning.actionLabel(item) ??
      this.clinicEvents.actionLabel(item) ??
      this.trays.actionLabel(item) ??
      (item.id === SHIFT_DESK && !this.preShift ? t("close.action") : null)
    );
  }

  // ---------- Shifts ----------

  /** Staff Office desk: end the day whenever the player chooses (same cleanup as 5 PM). */
  private confirmEndShift(): void {
    this.lockInput();
    const waiting = this.flow.queue().length;
    this.shiftDialog.begin({ title: t("close.title"), avatar: "🌇", subtitle: `${t("hud.day", { day: this.progress.shift })} · ${this.clock.label()}` }, () => {
      this.inputLocked = false;
    });
    const parts: string[] = [];
    if (this.caseRunner.caseOpen) parts.push(t("close.withPatient"));
    if (waiting) parts.push(waiting === 1 ? t("close.waiting1") : t("close.waitingN", { n: waiting }));
    const text = parts.length
      ? `${parts.join(" ")} ${t("close.rebooked")}`
      : t("close.wrapUp");
    void this.shiftDialog.say(text, t("close.confirm")).then((ok) => {
      if (!ok) return;
      this.shiftDialog.end();
      this.endShift();
    });
  }

  /**
   * Closes the day (5 PM or the Staff Office desk, one policy): no more arrivals; a patient
   * still with the doctor and anyone waiting are rebooked; routine visitors are finished off;
   * unanswered events expire; then the summary opens once.
   */
  private endShift(): void {
    this.shiftEndPending = false;
    if (this.progress.snapshot.shiftEnded) return;
    this.navigation.cancel();
    if (this.caseRunner.closeDay()) this.progress.countVisit("doctorRebooked");
    this.flow.closeDay();
    this.clinicEvents.endShift();
    this.progress.endShift();
    this.history.commit(); // a completed shift: today's visits join the saved history
    this.morning.reset(this.progress.shift);
    this.showShiftSummary();
  }

  private showShiftSummary(): void {
    if (this.shiftSummary.isOpen) return;
    this.lockInput();
    this.shiftSummary.open({
      progress: this.progress.snapshot,
      level: this.progress.level,
      onNextShift: () => this.startNextShift(),
    });
  }

  /** After the summary: a new day, the clinic closed until the player starts the shift. */
  private startNextShift(): void {
    this.progress.startNextShift();
    this.flow.openDay(this.progress.shift);
    this.clinicEvents.startShift(this.progress.shift);
    this.trays.reset();
    this.morning.reset(this.progress.shift);
    this.clock.setBeforeOpening();
    this.inputLocked = false;
    this.caseRunner.refreshObjective();
    this.persist();
    this.showBriefing();
  }

  /** The same day again, from before opening: no patients, no events, clean trays. */
  private restartDay(): void {
    this.caseRunner.closeDay();
    this.progress.restartDay();
    this.history.discardPending(); // rolled back with the day's points and coins
    this.flow.openDay(this.progress.shift);
    this.clinicEvents.startShift(this.progress.shift);
    this.trays.reset();
    this.morning.reset(this.progress.shift);
    this.clock.setBeforeOpening();
    this.caseRunner.refreshObjective(); // the old "call the next patient" banner goes too
    const start = ROOMS.find((r) => r.id === "reception")!.spawn;
    this.player.teleportTo(start.x, start.y);
    this.currentRoomId = "reception";
    this.persist();
  }

  // ---------- developer panel (src/dev/DevPanel.ts) ----------

  /**
   * Dev: get past the title, the doctor picker and the briefing straight into an open clinic,
   * closing whatever panel is up. Saved progress is otherwise left as it is.
   */
  private devReady(): void {
    document.querySelector(".title-screen")?.remove();
    titleMusic(false);
    document.querySelectorAll("#ui-root .modal-overlay:not(.hidden)").forEach((o) => o.classList.add("hidden"));
    if (this.onTitle) {
      this.onTitle = false;
      const cam = this.cameras.main;
      cam.setZoom(this.playZoom);
      cam.startFollow(this.player, true, 0.12, 0.12);
      this.fitCamera();
      this.hud.root.classList.remove("hud-off");
    }
    if (!this.character) {
      this.character = CHARACTERS[0];
      this.player.setCharacter(this.character.sheet);
      this.hud.setAvatar(this.character);
    }
    if (this.progress.snapshot.shiftEnded) this.progress.startNextShift();
    if (this.preShift) {
      this.morning.reset(this.progress.shift);
      this.progress.startShift();
      this.clock.reset();
      this.caseRunner.refreshObjective();
    }
    this.navigation.cancel();
    this.inputLocked = false;
    this.persist();
  }

  private devApi(): DevApi {
    return {
      patients: PATIENTS.map((p) => ({ id: p.id, name: p.name })),
      visits: Object.values(CASE_TEMPLATES).map((v) => ({ id: v.id, title: v.title, care: !!v.care })),
      events: EVENTS.map((e) => ({ id: e.id, title: e.title })),
      openCase: (identityId, templateId, stage) => {
        this.devReady();
        this.caseRunner.closeDay();
        const id = this.flow.devSeat(identityId, templateId);
        if (!id) return "The waiting seats are full";
        this.flow.devTake(id);
        const room = ROOMS.find((r) => r.id === (stage === "care" ? "care" : "consult"))!;
        this.player.teleportTo(room.spawn.x, room.spawn.y);
        this.caseRunner.devOpen(id, identityId, templateId, stage);
        return null;
      },
      openEvent: (id) => {
        this.devReady();
        // the tray request only stays open while a tray is waiting to be cleaned
        if (id === "tray-cleaning" && !this.trays.dirty) this.trays.use();
        this.clinicEvents.devOpen(id);
      },
      clockIn: () => {
        this.devReady();
        this.lockInput();
        const card = STAFF.find((c) => c.characterId === this.character?.id);
        void playClockIn(document.getElementById("game-container")!, card?.name ?? "", "8:00 AM").then(() => (this.inputLocked = false));
      },
      morning: (what) => {
        if (what !== "restart") {
          this.devReady();
          return this.morning.devPreview(what);
        }
        // redo today from before opening (today's points roll back), then clock in again
        this.devReady();
        this.navigation.cancel();
        this.restartDay();
        this.startShift();
      },
      briefing: () => {
        this.devReady();
        this.lockInput();
        const card = STAFF.find((c) => c.characterId === this.character?.id);
        this.briefing.open({
          day: this.progress.shift,
          time: this.clock.label(),
          doctor: { name: card?.name ?? this.character?.label ?? "", portrait: card?.portrait ?? "" },
          trays: { clean: this.trays.clean, total: TRAYS.count },
          prayerReminders: prayerReminders(),
          onStart: () => (this.inputLocked = false),
          onChangeDoctor: () => this.characterSelect.open(this.character?.id, false),
          onExplore: () => (this.inputLocked = false),
        });
      },
      summary: () => {
        this.devReady();
        this.endShift();
      },
      title: () => window.location.reload(),
      setClock: (minutes) => {
        this.devReady();
        this.clock.devSet(minutes);
      },
      setSpeed: (x) => (this.devSpeed = x),
      addPatient: () => {
        this.devReady();
        this.flow.arriveNow();
      },
      fillQueue: () => {
        this.devReady();
        const here = new Set(this.flow.present.map((v) => v.identityId));
        const doctorVisits = Object.values(CASE_TEMPLATES).filter((v) => v.id !== "follow-up");
        for (const p of PATIENTS) {
          if (this.flow.queue().length >= 3) break;
          if (here.has(p.id)) continue;
          if (!this.flow.devSeat(p.id, doctorVisits[Math.floor(Math.random() * doctorVisits.length)].id)) break;
        }
      },
      status: () => {
        const m = this.caseRunner.mission;
        const visit = m.visit ? `${m.definition.patient.name}: ${m.status}` : "no case";
        return `Day ${this.progress.shift} · ${this.clock.label()} · ${visit} · queue ${this.flow.queue().length} · x${this.devSpeed}`;
      },
      reset: () => {
        resetAllProgress();
        window.location.reload();
      },
    };
  }

  /** The player's doctor, as patients greet them. */
  private doctorRef(): { id: string | null; name: string } {
    const card = STAFF.find((c) => c.characterId === this.character?.id);
    return { id: this.character?.id ?? null, name: card?.name ?? this.character?.label ?? "Doctor" };
  }

  /** Before the day's shift has started (the clinic is closed, nothing runs yet). */
  private get preShift(): boolean {
    const p = this.progress.snapshot;
    return !p.shiftStarted && !p.shiftEnded;
  }

  /** The day's briefing card: who is on duty, a few facts, Start shift. */
  private showBriefing(): void {
    if (!this.preShift || this.briefing.isOpen || !this.character) return;
    this.navigation.cancel();
    this.lockInput();
    const card = STAFF.find((c) => c.characterId === this.character!.id);
    this.briefing.open({
      day: this.progress.shift,
      time: this.clock.label(),
      doctor: { name: card?.name ?? this.character.label, portrait: card?.portrait ?? "" },
      trays: { clean: this.trays.clean, total: TRAYS.count },
      prayerReminders: prayerReminders(),
      onStart: () => this.startShift(),
      onChangeDoctor: () => {
        this.backToBriefing = true;
        this.characterSelect.open(this.character?.id, false);
      },
      onExplore: () => {
        this.inputLocked = false;
        this.hud.showRoomToast(`☀️  ${t("brief.notOpen")}`);
      },
    });
  }

  /** After the doctor picker that the briefing opened: show the briefing again. */
  private returnToBriefing(): void {
    if (!this.backToBriefing) return;
    this.backToBriefing = false;
    this.showBriefing();
  }

  /**
   * "Start shift": the fingerprint clock-in at 7:45, then the morning routine (phone call,
   * meeting, checklist) while the clock runs on. The clinic opens by itself at 8:00.
   */
  private startShift(): void {
    if (this.morning.active) return this.morning.resume();
    this.lockInput();
    const card = STAFF.find((c) => c.characterId === this.character?.id);
    const name = card?.name ?? this.character?.label ?? "";
    void playClockIn(document.getElementById("game-container")!, name, this.clock.label()).then(() => {
      this.inputLocked = false;
      this.morning.begin();
    });
  }

  /**
   * The clinic opens at 8:00: the patients queuing at the door walk in, Ravi's morning delivery
   * arrives, and the usual arrivals follow. Checklist tasks still left stay on as extra work;
   * the whole list done before 8:00 earns the bonus.
   */
  private openClinic(): void {
    this.progress.startShift();
    this.clock.reset();
    const complete = this.morning.clinicOpened();
    this.inputLocked = false;
    this.caseRunner.refreshObjective();
    this.announcer.show(`☀️  ${t("toast.dayStart", { day: this.progress.shift })}`, 4500);
    this.flow.morningRush(this.morning.queueSize);
    this.clinicEvents.offerNow("morning-delivery");
    if (complete) {
      const { coins, xp } = REWARDS.morningPrep;
      this.progress.addEventReward(coins, xp);
      play("coin");
      this.time.delayedCall(2200, () => this.hud.showRoomToast(`🎉  ${t("morning.bonus", { coins, xp })}`));
    }
    this.persist();
  }

  /** Freezes walking control (modal panels). Walking resumes when inputLocked is cleared. */
  private lockInput(): void {
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
  }

  /** Interactables that come and go at runtime (e.g. the case patient). */
  private addInteractable(item: InteractableDef): void {
    if (this.interactables.includes(item)) return;
    this.interactables.push(item);
    const marker = createMarker(this, item.x, item.y - (item.markerLift ?? MARKER_LIFT), item.kind === "npc", item.markerOnlyWhenNear);
    this.markers.set(item.id, marker);
    this.dynamic.add(item);
  }

  private removeInteractable(id: string): void {
    const i = this.interactables.findIndex((it) => it.id === id);
    if (i >= 0) {
      this.dynamic.delete(this.interactables[i]);
      this.interactables.splice(i, 1);
    }
    this.markers.get(id)?.container.destroy();
    this.markers.delete(id);
  }

  /** The task card: the patient case's step when there is one, otherwise the morning checklist. */
  private showObjective(): void {
    const [text, progress] = this.caseObjective[0] ? this.caseObjective : this.morningObjective;
    this.hud.setObjective(text, progress);
  }

  /** Where the task card points: the patient case first, then the morning checklist. */
  private objectiveTarget(): { item: InteractableDef | null; room: RoomId } | null {
    const room = this.caseRunner.questRoom();
    return room ? { item: this.caseRunner.questTarget(), room } : this.morning.target();
  }

  /** Objective banner: walk to whatever the active case (or the morning checklist) needs next. */
  private goToObjective(): void {
    if (this.inputLocked) return;
    const goal = this.objectiveTarget();
    if (!goal) return;
    const { item: target, room } = goal;
    const label = this.roomLabel(room);
    if (target) this.walkToItem(target, room, () => this.persist());
    else this.navigation.walkToRoom(room, () => this.persist());
    this.hud.showRoomToast(`🚶  ${t("toast.heading", { place: label.replace(/^\S+\s+/, "") })}`);
  }

  /**
   * Auto-walk up to an interactable so its Interact button shows on arrival: the front edge of
   * furniture (within its reach), or the closest free spot around a person, inside their reach.
   */
  private walkToItem(item: InteractableDef, room: RoomId, onArrive: () => void): void {
    if (item.area) {
      const front = { x: item.x, y: item.y + item.area.h / 2 + Math.min(22, item.radius - 8) };
      if (isWalkable(front.x, front.y) && this.navigation.walkTo(front, onArrive)) return;
    } else {
      const reach = item.radius * 0.7;
      const spots = [90, 45, 135, 0, 180, 270, 315, 225]
        .map((deg) => ({ x: item.x + Math.cos((deg * Math.PI) / 180) * reach, y: item.y + Math.sin((deg * Math.PI) / 180) * reach }))
        .filter((p) => isWalkable(p.x, p.y))
        .sort((a, b) => Math.hypot(a.x - this.player.x, a.y - this.player.y) - Math.hypot(b.x - this.player.x, b.y - this.player.y));
      if (spots.length && this.navigation.walkTo(spots[0], onArrive)) return;
    }
    this.navigation.walkNear({ x: item.x, y: item.y }, room, onArrive);
  }

  private walkPlayerTo(point: { x: number; y: number }): Promise<boolean> {
    this.navigation.cancel();
    this.scriptedWalking = true;
    return new Promise(resolve => {
      const finish = (arrived: boolean) => {
        this.scriptedWalking = false;
        resolve(arrived);
      };
      if (!this.navigation.walkTo(point, () => finish(true), () => finish(false))) {
        this.hud.showRoomToast(t("toast.noPath"));
        finish(false);
      }
    });
  }

  /** `required` on first launch, when no character has been chosen yet. */
  private openCharacterSelect(required: boolean): void {
    if (this.inputLocked && !required) return;
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
    this.characterSelect.open(this.character?.id, required);
  }

  private chooseCharacter(id: CharacterId): void {
    this.character = getCharacter(id);
    this.player.setCharacter(this.character?.sheet ?? null);
    this.hud.setAvatar(this.character);
    this.inputLocked = false;
    this.persist();
    // first launch, or "Change doctor" on the briefing card: (back) to the briefing
    if (this.preShift) this.backToBriefing = true;
    this.returnToBriefing();
  }

  /** Avatar button: the player's own staff ID card (the picker only opens on first launch). */
  private openProfile(): void {
    if (this.inputLocked) return;
    if (!this.character) return this.openCharacterSelect(true);
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
    this.profile.open(this.character.id);
  }

  private exitToMenu(): void {
    this.lockInput();
    this.navigation.cancel();
    this.persist();
    this.clock.save();
    if (exitToHost()) return;
    // Return to the normal title even when the opening was skipped for testing.
    const url = new URL(window.location.href);
    if (url.searchParams.get("title") === "off") url.searchParams.delete("title");
    window.history.replaceState(null, "", url);
    window.location.reload();
  }

  private openStaffDirectory(): void {
    if (this.inputLocked) return;
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
    this.staffDirectory.open(this.character?.id);
  }

  /** Card "Find" button: take the player to where that staff member is right now. */
  private findStaff(card: StaffCard): void {
    const spotId = card.meetAt ?? card.npcId;
    const spot = spotId ? this.interactables.find((i) => i.id === spotId) : undefined;
    const standing = POSE_NPCS.find((n) => n.id === card.npcId);
    const firstName = card.name.split(" ")[0];
    const arrived = () => {
      this.hud.showRoomToast(`👋  ${t("toast.found", { name: firstName })}`);
      this.persist();
    };
    // Walking nurses keep moving: aim for where they are now; they stop when the player is close.
    if (spot) this.navigation.walkNear({ x: spot.x, y: spot.y }, card.room, arrived);
    else if (standing) this.navigation.walkNear(standing.feet, card.room, arrived);
    else this.navigation.walkToRoom(card.room, arrived);
    this.hud.showRoomToast(`🚶  ${t("toast.goingTo", { name: firstName })}`);
  }

  private openFullMap(): void {
    if (this.inputLocked) return;
    this.inputLocked = true;
    this.movement.setJoystickVector(0, 0);
    this.player.setVelocity(0, 0);
    // In the hallway no room is "current", so every room is a valid destination.
    const here = findRoomAt(this.player.x, this.player.y)?.id ?? null;
    this.fullMap.open(
      here,
      { x: this.player.x, y: this.player.y },
      this.objectiveTarget()?.room ?? null,
      prayerReminders() && this.clock.currentPrayer() ? "surau" : null,
      this.clinicEvents.markerRoom()
    );
    this.snapshotClinic((src) => this.fullMap.setPhoto(src));
  }

  /**
   * The full map's picture: for one frame a second camera sees the whole clinic (the main view
   * is hidden), and that frame is captured. Shows the rooms' furniture and everyone where they
   * are right now. Calls back with a data URL, or null if the renderer can't take a snapshot.
   */
  private snapshotClinic(done: (src: string | null) => void): void {
    const { width, height } = this.scale;
    const zoom = Math.min(width / WORLD_BOUNDS.width, height / WORLD_BOUNDS.height);
    const w = Math.floor(WORLD_BOUNDS.width * zoom);
    const h = Math.floor(WORLD_BOUNDS.height * zoom);
    const main = this.cameras.main;
    const cam = this.cameras.add(0, 0, w, h);
    cam.setZoom(zoom);
    cam.centerOn(WORLD_BOUNDS.width / 2, WORLD_BOUNDS.height / 2);
    main.setVisible(false);
    const restore = () => {
      this.cameras.remove(cam);
      main.setVisible(true);
    };
    try {
      this.game.renderer.snapshotArea(0, 0, w, h, (image) => {
        restore();
        done(image instanceof HTMLImageElement ? image.src : null);
      }, "image/jpeg", 0.9);
    } catch {
      restore();
      done(null);
    }
  }

  private handleGoHere(roomId: RoomId): void {
    const label = this.roomLabel(roomId);
    const started = this.navigation.walkToRoom(roomId, () => {
      this.hud.showRoomToast(label);
      this.persist();
    });
    if (started) this.hud.showRoomToast(`🚶  ${t("toast.walking", { place: label.replace(/^\S+\s+/, "") })}`);
    else this.hud.showRoomToast(t("toast.noPath"));
  }

  private roomLabel(id: RoomId | null): string {
    if (!id) return `🚪  ${t("hud.hallway")}`;
    const room = ROOMS.find((r) => r.id === id)!;
    return `${room.icon}  ${room.label}`;
  }

  // ---------- Loop ----------

  update(_time: number, delta: number): void {
    if (this.inputLocked && !this.scriptedWalking) {
      this.player.setVelocity(0, 0);
    } else if (this.navigation.walking && (this.scriptedWalking || !this.movement.hasInput())) {
      this.navigation.update(delta);
    } else {
      // manual input always wins: it cancels any auto-walk in progress
      if (this.navigation.walking) this.navigation.cancel();
      this.movement.update();
    }
    this.player.tick(delta);
    this.soundscape.update(delta, {
      title: this.onTitle,
      open: !this.preShift && !this.progress.snapshot.shiftEnded,
      visitors: this.flow.present.length,
      room: findRoomAt(this.player.x, this.player.y)?.id ?? null,
      panel: this.inputLocked,
      riding: this.player.riding,
      speed: this.player.body.velocity.length(),
    });

    const room = findRoomAt(this.player.x, this.player.y);
    if (room && room.id !== this.currentRoomId) {
      this.currentRoomId = room.id;
      this.hud.showRoomToast(this.roomLabel(room.id));
    }

    const playerPos = { x: this.player.x, y: this.player.y };
    for (const npc of this.poseNpcs) npc.update(delta, playerPos);
    for (const walker of this.walkers) walker.update(delta, playerPos, this.inputLocked);
    const paused = this.inputLocked || this.preShift;
    const simDelta = delta * this.devSpeed;
    this.flow.update(simDelta, paused);
    const queue = this.flow.queue();
    this.queuePanel.update(queue);
    const queueKey = queue.map((q) => q.instanceId).join(",");
    if (queueKey !== this.queueKey) {
      // someone joined or left the queue: the "call next" objective may change
      this.queueKey = queueKey;
      this.caseRunner.refreshObjective();
    }
    this.caseRunner.update();
    this.clinicEvents.update(simDelta, paused);
    this.trays.update(simDelta, paused);
    if (this.shiftEndPending && !this.inputLocked) this.endShift();
    if (!paused) this.clock.tick(simDelta);
    else if (this.preShift && this.morning.active && !this.inputLocked) {
      // clocked in, clinic not open yet: 7:45 → 8:00 runs slowly (normal speed once the
      // checklist is done), then the clinic opens by itself
      this.clock.tick(simDelta * (this.morning.ready ? 1 : TIME.morningSpeed));
      if (this.clock.minutesOfDay >= 8 * 60) this.openClinic();
    }
    this.hud.setStartShift(this.preShift && !this.morning.active && !this.onTitle && !this.briefing.isOpen);
    this.hud.setClock(this.clock.label());
    this.amenities.update(room?.id ?? null);
    if (this.preShift) this.morning.update(room?.id ?? null, this.inputLocked);
    else if (this.morning.beforeOpeningOnly) {
      // a step that only belongs before opening is still set (e.g. the clinic was opened from
      // the dev panel while the phone rang): settle it the way 8:00 would
      this.morning.clinicOpened();
    }
    for (const item of [...WALKER_NPCS.map((d) => d.talk), ...this.dynamic]) {
      this.markers.get(item.id)?.setPosition(item.x, item.y - (item.markerLift ?? MARKER_LIFT));
    }

    this.nearestInteractable = this.interaction.getNearest(this.player.x, this.player.y);
    this.markers.forEach((m, id) => m.setActive(id === this.nearestInteractable?.id));
    const near = this.inputLocked ? null : this.nearestInteractable;
    const action = near ? this.actionLabel(near) : null;
    this.hud.setInteractTarget(near && action ? { ...near, label: action } : near);

    const quest = this.objectiveTarget()?.item ?? null;
    // No "!" bubbles over objects: players explore and find things themselves; the Interact
    // button appears when they are close. (Markers are kept so they can be switched back on.)
    this.markers.forEach((m) => m.setHidden(SHOW_INTERACT_BUBBLES ? this.inputLocked : true));
    const eventAt = this.clinicEvents.markerRoom() ? this.clinicEvents.target() : null;
    this.miniMap.draw(this.player.x, this.player.y, this.currentRoomId, this.player.lastFacingAngle, quest, eventAt);
  }

  private persist(): void {
    saveGame({
      version: SAVE_VERSION,
      playerX: this.player.x,
      playerY: this.player.y,
      currentRoomId: this.currentRoomId,
      settings: { musicOn: true, character: this.character?.id },
    });
  }
}
