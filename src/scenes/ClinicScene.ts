import Phaser from "phaser";
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
import Announcement from "../ui/case/Announcement";
import CaseDialog from "../ui/case/CaseDialog";
import ShiftSummary from "../ui/ShiftSummary";
import ShiftBriefing from "../ui/ShiftBriefing";
import { playClockIn } from "../ui/ClockIn";
import { STAFF } from "../data/staff";
import Progress from "../systems/Progress";
import EventDirector from "../events/EventDirector";
import { eventBus } from "../game/EventBus";
import { prayerReminders } from "../game/settings";
import CareTrays from "../systems/CareTrays";
import ClinicFlow from "../clinic/ClinicFlow";
import QueuePanel from "../ui/QueuePanel";
import Pathfinder from "../systems/Pathfinding";
import { amyBusyChance, TRAYS } from "../data/gameplay";
import { runTap, stallSequence } from "../art/amenityFx";
import type { StaffCard } from "../data/staff";
import { CHARACTERS, getCharacter, type CharacterId, type PlayableCharacter } from "../data/assets";
import {
  ROOMS,
  HALLWAY,
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
import { RENDER_SCALE } from "../game/display";
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
/** The Staff Office desk is where the player ends a shift. */
const SHIFT_DESK = "office-desk";

export default class ClinicScene extends Phaser.Scene {
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
  private announcer!: Announcement;
  private progress = new Progress();
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

  constructor() {
    super("ClinicScene");
  }

  create(): void {
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
    cam.setZoom(RENDER_SCALE);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setRoundPixels(false);
    this.fitCamera();
    this.showOverview(); // title screen first: the whole clinic from above
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitCamera, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitCamera, this));

    this.movement = new MovementSystem(this, this.player);
    this.interaction = new InteractionSystem(this.interactables);
    this.navigation = new NavigationSystem(this, this.player, this.npcSolids());

    this.buildUI();
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

  /**
   * Matches the camera to the (possibly rotated) screen. If the screen shows more than the
   * whole clinic along one axis — e.g. a wide landscape tablet — the bounds grow evenly on both
   * sides so the clinic stays centred instead of sticking to one edge.
   */
  private fitCamera(): void {
    if (this.onTitle) return this.showOverview();
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    const viewW = this.scale.width / RENDER_SCALE;
    const viewH = this.scale.height / RENDER_SCALE;
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
    const ms = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1300;
    const start = () => {
      this.onTitle = false;
      cam.startFollow(this.player, true, 0.12, 0.12);
      this.fitCamera();
      this.hud.root.classList.remove("hud-off");
      this.inputLocked = false;
      this.hud.showRoomToast(this.roomLabel(findRoomAt(this.player.x, this.player.y)?.id ?? null));
      // first launch: choose a doctor; refreshed during the day's summary: show it again;
      // otherwise the day's briefing card (the clinic opens when the player starts the shift)
      if (!this.character) this.openCharacterSelect(true);
      else if (this.progress.snapshot.shiftEnded) this.showShiftSummary();
      else if (this.preShift) this.showBriefing();
    };
    if (!ms) {
      cam.setZoom(RENDER_SCALE);
      return start();
    }
    // a moment to take in the whole clinic after stepping inside, then down to the doctor
    this.time.delayedCall(900, () => {
      cam.zoomTo(RENDER_SCALE, ms, "Sine.easeInOut");
      cam.pan(this.player.x, this.player.y, ms, "Sine.easeInOut", false, (_c, progress) => {
        if (progress >= 1) start();
      });
    });
  }

    // ---------- World ----------

  private drawWorld(): void {
    drawGarden(this);

    drawFloor(this, HALLWAY, HALLWAY_FLOOR);
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
      setObjective: (text, progress) => this.hud.setObjective(text, progress),
      nextInQueue: () => this.flow.queue()[0] ?? null,
      callNext: () => this.flow.callNext(),
      patientNpc: (id) => this.flow.npc(id),
      caseCompleted: (id) => this.flow.caseCompleted(id),
      visitorGone: (id) => this.flow.remove(id),
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
    // left the game during a shift: that day starts over (from 7:45, at the entrance)
    if (this.progress.shiftUnfinished) this.restartDay();
    if (this.preShift) this.clock.setBeforeOpening();
    this.amenities = new Amenities({
      uiRoot,
      canPray: () => (this.character ?? CHARACTERS[0]).prays,
      lock: () => this.lockInput(),
      unlock: () => (this.inputLocked = false),
      toast: (text) => this.hud.showRoomToast(text),
      setPlayerVisible: (v) => this.player.setVisible(v),
      teleport: (p) => {
        this.navigation.cancel();
        this.player.teleportTo(p.x, p.y);
      },
      playStall: (enter) => {
        const stall = this.interactables.find((i) => i.id === "toilet-stall")!;
        const bottom = { x: stall.x, y: stall.y + (stall.area?.h ?? 0) / 2 };
        return stallSequence(this, this.player, bottom, { x: stall.x, y: bottom.y + 26 }, enter);
      },
      playTap: (ms) => {
        const sink = this.interactables.find((i) => i.id === "toilet-sink")!;
        this.player.teleportTo(sink.x - 6, sink.y + (sink.area?.h ?? 0) / 2 + 22);
        this.player.face("up"); // facing the sink
        return runTap(this, { x: sink.x, y: sink.y + (sink.area?.h ?? 0) / 2 }, ms);
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
  }

  private handleInteract(): void {
    if (this.inputLocked || !this.nearestInteractable) return;
    const item = this.nearestInteractable;
    this.navigation.cancel();
    // the patient case's current step decides first, then an optional event at this spot,
    // then a hint for a later case step; otherwise the item's own line
    if (this.amenities.handle(item)) return;
    if (this.caseRunner.handle(item)) return;
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
      this.amenities.actionLabel(item) ??
      this.caseRunner.actionLabel(item) ??
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
    this.flow.openDay(this.progress.shift);
    this.clinicEvents.startShift(this.progress.shift);
    this.trays.reset();
    this.clock.setBeforeOpening();
    this.caseRunner.refreshObjective(); // the old "call the next patient" banner goes too
    const start = ROOMS.find((r) => r.id === "reception")!.spawn;
    this.player.teleportTo(start.x, start.y);
    this.currentRoomId = "reception";
    this.persist();
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

  /** "Start shift": the fingerprint clock-in, then the clinic opens at 8:00. */
  private startShift(): void {
    this.lockInput();
    const card = STAFF.find((c) => c.characterId === this.character?.id);
    const name = card?.name ?? this.character?.label ?? "";
    void playClockIn(document.getElementById("game-container")!, name, "8:00 AM").then(() => this.openClinic());
  }

  /** The clinic opens at 8:00, patients start arriving. */
  private openClinic(): void {
    this.progress.startShift();
    this.clock.reset();
    this.inputLocked = false;
    this.caseRunner.refreshObjective();
    this.announcer.show(`☀️  ${t("toast.dayStart", { day: this.progress.shift })}`, 4500);
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

  /** Objective banner: walk to whatever the active case needs next. */
  private goToObjective(): void {
    if (this.inputLocked) return;
    const target = this.caseRunner.questTarget();
    const room = this.caseRunner.questRoom();
    if (!room) return;
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
      this.caseRunner.questRoom(),
      prayerReminders() && this.clock.currentPrayer() ? "surau" : null,
      this.clinicEvents.markerRoom()
    );
  }

  private handleGoHere(roomId: RoomId): void {
    const label = this.roomLabel(roomId);
    const started = this.navigation.walkToRoom(roomId, () => {
      this.hud.showRoomToast(label);
      this.persist();
    });
    if (started) this.hud.showRoomToast(`🚶  ${t("toast.walking", { place: label.replace(/^\S+\s+/, "") })}`);
  }

  private roomLabel(id: RoomId | null): string {
    if (!id) return `🚪  ${t("hud.hallway")}`;
    const room = ROOMS.find((r) => r.id === id)!;
    return `${room.icon}  ${room.label}`;
  }

  // ---------- Loop ----------

  update(_time: number, delta: number): void {
    if (this.inputLocked) {
      this.player.setVelocity(0, 0);
    } else if (this.navigation.walking && !this.movement.hasInput()) {
      this.navigation.update(delta);
    } else {
      // manual input always wins: it cancels any auto-walk in progress
      if (this.navigation.walking) this.navigation.cancel();
      this.movement.update();
    }
    this.player.tick(delta);

    const room = findRoomAt(this.player.x, this.player.y);
    if (room && room.id !== this.currentRoomId) {
      this.currentRoomId = room.id;
      this.hud.showRoomToast(this.roomLabel(room.id));
    }

    const playerPos = { x: this.player.x, y: this.player.y };
    for (const npc of this.poseNpcs) npc.update(delta, playerPos);
    for (const walker of this.walkers) walker.update(delta, playerPos, this.inputLocked);
    const paused = this.inputLocked || this.preShift;
    this.flow.update(delta, paused);
    const queue = this.flow.queue();
    this.queuePanel.update(queue);
    const queueKey = queue.map((q) => q.instanceId).join(",");
    if (queueKey !== this.queueKey) {
      // someone joined or left the queue: the "call next" objective may change
      this.queueKey = queueKey;
      this.caseRunner.refreshObjective();
    }
    this.caseRunner.update();
    this.clinicEvents.update(delta, paused);
    this.trays.update(delta, paused);
    if (this.shiftEndPending && !this.inputLocked) this.endShift();
    if (!paused) this.clock.tick(delta);
    this.hud.setStartShift(this.preShift && !this.onTitle && !this.briefing.isOpen);
    this.hud.setClock(`${t("hud.day", { day: this.progress.shift })} · ${this.clock.label()}`);
    this.amenities.update(room?.id ?? null);
    for (const item of [...WALKER_NPCS.map((d) => d.talk), ...this.dynamic]) {
      this.markers.get(item.id)?.setPosition(item.x, item.y - (item.markerLift ?? MARKER_LIFT));
    }

    this.nearestInteractable = this.interaction.getNearest(this.player.x, this.player.y);
    this.markers.forEach((m, id) => m.setActive(id === this.nearestInteractable?.id));
    const near = this.inputLocked ? null : this.nearestInteractable;
    const action = near ? this.actionLabel(near) : null;
    this.hud.setInteractTarget(near && action ? { ...near, label: action } : near);

    const quest = this.caseRunner.questTarget();
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
