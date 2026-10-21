# Eczema Care Hero — Phase 3

Mobile-first walkable clinic game, built with **Phaser 4 + TypeScript + Vite**. Phase 1 built the
clinic, characters, movement and maps. Phase 2 added patient care and optional clinic events.
Phase 3 makes it a living clinic: visitors keep arriving all day. No online leaderboard,
accounts or backend; everything is saved locally in the browser.

## Opening, title and settings

The game opens on a screen full of clouds (which also covers asset loading). After about two
seconds they part from the centre outwards and reveal the **town** from above: an SVG drawn in
the clinic's style (`src/art/town.ts`), with the clinic in the middle among cottages, a
pharmacy, a bakery, a fountain plaza, a field, a pond and woods. Then the title appears with
**PLAY** and **SETTINGS**. While the title is up the game is paused (clock and arrivals stop).
PLAY dives into the clinic's front door, a soft flash as we step inside, then the clinic interior
from above (in landscape, the entrance side, larger), and finally the camera zooms down to the
doctor; a new player then picks a doctor.
**Before the shift:** ENTER takes the doctor inside, but the clinic isn't open yet: the clock
waits at 7:45 AM, no patients arrive, events and tray cleaning wait. A briefing card shows who is
on duty (with **Change doctor**), a few facts about the day and a big **Start shift** button
(8:00 AM, patients start arriving). "Look around first" closes it; a green Start shift button then
stays in the HUD. Every new day starts like this.
Leaving the game during a shift (closing or reloading the page, back to the title) restarts that
day from 7:45 AM at the entrance: patients, events and the open case are cleared, and points,
coins and XP earned in that unfinished shift are rolled back (`Progress.restartDay`). A day that
was closed (summary) is kept. (`src/ui/ShiftBriefing.ts`,
`Progress.shiftStarted`.)

Title menu: **ENTER**, then **How to play** (six swipeable cards), **Badges** (an empty shelf for
now; the collection comes later), **Language** and **Settings**.
Settings: sound on/off (announcement chimes), prayer time reminders (announcements only), and
"Start again" (erases saved progress, with a confirm tap).

**Language** (`src/game/i18n.ts`): English / Bahasa Melayu for menus and UI (title, How to play,
doctor picker, HUD, map, profile and staff cards, closing dialog, day summary, room names).
Patient dialogue, case content and events are still English. Changing language reloads the page
(the clouds part straight away) so every label, including the room plaques, follows. Add a string:
one entry in `STRINGS` with `en` and `ms`, then `t("key")`.

**Playable doctors** (`CHARACTERS` in `src/data/assets.ts`): Dr. Nadia, Dr. Faris, Dr. Jasmine,
Dr. Wei Jie, Dr. Kavitha, Dr. Arvind. Each has a staff ID card in `src/data/staff.ts`. `prays`
decides whether the doctor has a Pray action at the Surau mat (Dr. Nadia and Dr. Faris); everyone
can visit the Surau. Code: `src/ui/TitleScreen.ts`, `src/art/town.ts`, `src/ui/title.css`, `src/game/settings.ts`,
`showOverview()` / `leaveTitle()` in `ClinicScene`. Testing: `?title=off` skips the opening.

## Phase 3 — living clinic and continuous patient flow

**A day:** the clinic opens at 8:00 AM. Visitors arrive every 12–25 in-game minutes (about every
25–50 real seconds) until the last-arrival cut-off. Each one is either:

- **a doctor patient (≈60%):** registers with Nurul at Reception (speech bubbles), sits in the
  Waiting Area and joins the **doctor queue** (panel on the left; on the right in landscape)
  with a **patience bar**. The doctor calls the first one in at the Consultation desk. Then the
  visit works as in Phase 2: chat, Dr. Lim's assessment, Care Room if the plan needs it, and the
  patient collects any approved item from Grace and leaves on their own.
- **a routine visitor (≈40%):** Nurul answers them, or sends them on to Grace, then they leave.
  Never in the doctor queue, no patience bar, no score.

Patience only drains while the patient waits (it stops when the doctor calls them, and while
panels are open). At 0% the patient says "I'll come back another day 🙂" and walks out calmly.
That's counted in the summary, and no points are taken away.

**Visitors** (`src/data/patients.ts`): 8 reusable identities (Amina, Daniel, Siti, Sarah,
Uncle Wong, Farid, Mak Cik Rohana, Suresh). An identity is never in the clinic twice at once.
The same person can come back for a different reason; a **follow-up** is only offered to someone
who has already completed a doctor visit. All eight have their own walking and seated sprites and
a portrait (prompts in `art-source/CHARACTER_PROMPTS.md`). A future identity without art can borrow
Amina's sprites with a `tint`; it then gets a name tag automatically. Sheets are sliced with `node tools/slice-sprite-sheet.mjs`
and portraits made with `node tools/make-portrait.mjs` (Node ports of the Python tools; they
need the `sharp` dev dependency, no Python).

**Visit templates** are separate from identities. Doctor: `case001` (dry hands, with Care Room
moisturiser, max **120**), `itchy-patch` (consultation only, max 100), `follow-up` (consultation
only, max 100), in `src/data/cases/`. Routine: opening hours, appointment booking, collect a
prepared item, stock question, storage question (`src/data/visits.ts`). On day 1 the first
patient is always Amina with `case001`, as a regression check.

**Closing** (5:00 PM or the Staff Office desk, same policy): no more arrivals; a patient still
with the doctor and everyone waiting are **rebooked** for another day; routine visitors are
finished off; unanswered events expire; one summary opens. The summary is now per **Day** and
shows patients helped, left while waiting, rebooked, and visitors Nurul & Grace looked after,
next to the care / event / arcade ledgers.

**Configurable values** (`src/data/gameplay.ts`, `CLINIC`):

| Setting | Default |
|---|---|
| Clinic hours | 8:00 AM – 5:00 PM (clock) |
| First arrival / last arrival | 8:02 AM / 4:15 PM |
| Time between arrivals | 12–25 in-game minutes (retry after 3 when full). The brief suggests 30–60, but at 30 game minutes per real minute that felt empty |
| Doctor patients waiting at once | 3 (one per free waiting seat) |
| Routine visitors at once | 2 |
| Visit mix | 60% doctor / 40% routine |
| Doctor patience | 3–5 minutes of play time |
| Registration / service time | 2.6 s / 3.2 s |
| Doctor visit weights | `DOCTOR_VISITS` in `src/data/visits.ts` |

**Testing switches:** `?clinic=busy` (first visitor at once, arrivals every 5–10 in-game
minutes; caps unchanged). It combines with `?events=always` / `?events=off`, e.g.
`?clinic=busy&events=off`. `?reset=1` wipes all saved progress and starts again from Day 1.

The first time the living clinic runs on an older save, the day restarts at 8:00 AM so a
late saved clock doesn't leave the clinic empty.

## Phase 2 — patient care first, occasional optional events

**Core loop:** start shift → the patient registers with Nurul → the doctor calls her into
Consultation → chat + Dr. Lim's assessment (same room) → moisturiser in the Care Room →
thank-you and result (one **Continue** button; the day carries on) → the day ends at the Staff
Office desk ("Close the clinic") or automatically at 5:00 PM.

**The patient comes to the doctor**, not the other way round: the doctor only walks between
Consultation and the Care Room. Amina walks there herself, then collects her cream from Grace at
the Pharmacy on her own and goes home. Reception, Storage and the Pharmacy only need the doctor
when an optional event happens.

**Case #001 – Amina** (`src/data/cases/case001.ts`, all clinical text in one reviewable file).
State machine `AVAILABLE → ACCEPTED → INTERVIEWED → DOCTOR_REVIEWED → CARE_COMPLETED →
HANDOVER_DONE → COMPLETED`, guarded in `MissionController`.

| Step | Where | What the player does |
|---|---|---|
| A | Consultation desk / Dr. Lim | Read the case file Nurul registered, **📢 Call Amina in** (she walks over from the Waiting Area) |
| B | Consultation (Amina) | Ask 3 questions (any order, no quiz); answers become case notes |
| C | Consultation (opens right after B) | Tap highlighted skin areas; Dr. Lim gives the care plan + when to seek help |
| D | Care Room (Amina) | Pick the fragrance-free cream, squeeze the right amount, smooth it on slowly |
| E | (automatic) | Amina collects her cream from Grace at the Pharmacy herself |
| F | (automatic) | Amina says thank you; result screen; she goes home |

The objective banner (with a progress bar) always shows the next step; **Go ›** walks there.
Talking to a later step's person or object early gives a friendly hint instead of breaking
anything.

**Optional events** (`src/events/`): after a patient step, an event *may* be offered (default
35% per step, max 2 per shift, one active at a time, never the same type, and preferably not
the same room, twice in a row; a guaranteed tutorial event on shift 1). Its notice waits until no panel is open. It shows a
HUD notice (Go / Later / Dismiss), an orange **!** on the mini map, full map and over the spot,
and expires quietly after 4 minutes of play. Ignoring an event never blocks the patient.

- **Registration error** (Reception desk): pick the record that matches the patient's form.
- **Low stock** (Storage shelf or Ravi): drag the labelled box onto the empty slot (or tap
  the box, then the slot), confirm.
- **Pharmacy: which item?** (Pharmacy counter): Grace isn't sure which product matches a care
  card. Pick the matching item, tick the label checks.
- **Pharmacy shelf mix-up** (Pharmacy counter): put three items back on the slots their labels
  name (same drag / tap mechanic as Low stock).
- **Clean a used care tray** (Care Room sink): not random, see Care trays below.

**Care trays** (`src/systems/CareTrays.ts`): the Care Room has 3 trays. There is no display in
the world: the treatment screen shows how many clean trays are left ("🧺 2/3 clean", orange when
none will be left after this session). Each care session needs a clean tray and uses it.
Nurse Amy normally cleans used trays herself (about 40 s of play each). But when a tray is used
there's a 50% chance she's busy, and she asks the doctor through the event system (same notice,
"!" markers, Later / Dismiss, counts toward the 2-per-shift cap). Cleaning is a short mini-game
at the sink: scrub off the cream smudges, hold to rinse, tap the drops to pat dry, put it on
the rack (+15 coins, +5 XP). The doctor may also clean a tray any time at the sink (no reward).
With no clean tray, a care session waits and Amy says when one will be ready, so nothing gets
stuck. A new shift starts with all trays clean. This matters more once a shift has several
patients.

**Scoring** (`src/data/gameplay.ts`, `src/systems/Progress.ts`): three separate ledgers.
Care points (case +100, each care interaction +20, or +10 after a wrong pick) are the main
score. Event rewards (+15 coins, +5 XP each) never add care points. Arcade coins stay
separate too (the arcade games aren't connected yet). The end-of-shift summary shows all three.

**Testing switches:** add `?events=always` to the URL to offer an event at every trigger point
(still capped at 2 per shift) or `?events=off` to disable them. To start over, clear the site's
localStorage.

## Setup

```bash
npm install
npm run dev      # local dev server with hot reload
npm run build    # production build into dist/
npm run preview  # preview the production build locally
```

Open the dev server URL in a browser; for a true mobile feel, open your browser's device
toolbar (or visit from a phone on the same network via `npm run dev -- --host`) and pick a
~390×844 portrait viewport.

## Controls

- **Touch**: bottom-left virtual joystick to move, bottom-right **Interact** button appears
  near an interactable object/NPC, tap the mini-map (top-right) to open the full map.
- **Character**: on first launch the player picks the female or male doctor (saved). The round
  face button at the top-left of the HUD opens **My Profile**: the player's own staff ID card,
  with "Change doctor" and "Exit" buttons. Exit asks for confirmation before returning to
  the main menu; Cancel keeps the profile open. An unfinished shift restarts when playing again.
- **Desktop**: arrow keys or WASD to move; **E** / **Space** to interact; **M** to open the map;
  **Esc** closes any dialog. HUD buttons also work with the mouse.

## Gameplay flow implemented

Launch → spawn at Reception → walk the clinic with the joystick/keys → approach an
object/NPC to reveal **Interact** → tap to see placeholder dialogue → close → tap the
mini-map → pick a room in the full map → **Go Here** makes the doctor walk there on their own (through doors, around furniture) →
reload the page → player position and current room are restored from `localStorage`.

## Project structure

```
src/
  main.ts                 Entry point, boots the Phaser game
  style.css               HUD, joystick and modal styling (theme colours are CSS variables at the top)
  game/config.ts          Phaser game config (scale, physics, scene list)
  game/display.ts         Design size (390x844), high-DPI render scale, UI font
  game/EventBus.ts        Tiny pub/sub (not currently required cross-module, kept minimal)
  scenes/BootScene.ts     Boot step (waits briefly for the web font), then starts ClinicScene
  scenes/ClinicScene.ts   Builds the clinic, wires systems + UI together, owns the game loop
  entities/Player.ts      Player avatar: physics body, 8-direction facing, walk bob, depth sort
  systems/Movement.ts     Joystick + keyboard input -> player velocity
  systems/Interaction.ts  Finds the nearest interactable within range (centre or edge distance)
  systems/Navigation.ts   Auto-walk to a room or person (Go Here / Find); cancelled by any manual input
  systems/Pathfinding.ts  Grid A* over the floor + path straightening, used by auto-walk
  ui/HUD.ts               DOM overlay: stats, joystick, interact button, room toast, mini-map card
  ui/MiniMap.ts           Canvas mini-map (always visible, tap to open full map)
  ui/FullMap.ts           Full map modal: scaled floor plan, select a room, Go Here / Close
  ui/Dialog.ts            Generic interaction dialog modal
  data/rooms.ts           Single source of truth: room bounds, doors, spawns, furniture, interactables
  data/furniture.ts       Furniture catalog: collision footprint + render layer per kind
  data/save.ts            localStorage save/load with validation + safe fallback
  data/gameplay.ts        Phase 2 tunables: rewards, event odds / cap / expiry, ?events= override
  data/cases/case001.ts   Patient Case #001 (all case text and clinical content)
  mission/                Case state machine (MissionController) and world flow (CaseRunner)
  events/                 Optional event registry, scheduler/lifecycle (EventDirector), types
  systems/Progress.ts     Shifts, XP/level, separate care / event / arcade ledgers
  systems/CareTrays.ts    Care Room trays: clean/used, Nurse Amy cleaning, rack display
  clinic/ClinicFlow.ts    Phase 3: arrival scheduler, visitor states, doctor queue + patience, Nurul/Grace service
  data/patients.ts        Phase 3: the 8 reusable patient identities
  data/visits.ts          Phase 3: doctor visit weights and routine service visits
  data/cases/             Doctor visit templates (case001, itchyPatch, followUp) + shared steps
  ui/QueuePanel.ts        Phase 3: doctor queue with patience bars
  ui/case/                Case panels: Interview, Consultation, Treatment, CaseResult
  ui/events/              Event notice + RegistrationPanel, ShelfPanel (Storage + Pharmacy), PharmacyCheckPanel, TrayCleanPanel
  ui/ShiftSummary.ts      End-of-shift results
  art/palette.ts          Pastel colour palette + small drawing helpers
  art/environment.ts      Floors, walls, garden, doors, wall plaques, interaction bubbles
  art/furniture.ts        How each furniture kind is drawn
  art/characters.ts       Chibi staff avatar (player) and seated visitors
```

Outside `src/`:

```
public/assets/     Images the game loads (sliced spritesheets, staff portraits), copied as-is into dist/
art-source/        Original full-size AI art. NOT bundled — kept to re-slice, recolour or make
                   portraits with the scripts in tools/
tools/             Python scripts: slice-sprite-sheet.py, recolor-fabric.py, make-portrait.py
```

### Room config, spawn points, and replacing placeholder art

**Layout.** The clinic is a portrait floor plan sized for a phone: a central hallway with rooms
on both sides and the main entrance at the bottom, following a patient's visit from front to
back:

```
[ Staff Office ]  hall  [ Storage      ]   <- staff area at the back
[ Staff Lounge ]  hall  [ Arcade Room  ]
[ Care Room    ]  hall  [ Toilet (1/2) ]
                        [ Surau  (1/2) ]
[ Consultation ]  hall  [ Pharmacy     ]   <- see the doctor, then collect products
[ Reception    ]  hall  [ Waiting Area ]   <- first rooms visitors reach
               entrance
```

Every room has one door onto the hallway; Toilet and Surau are half-height rooms sharing a slot.
To move a room, change which `origin(col, row, half)` it uses near the top of the "Rooms"
section of `src/data/rooms.ts`; the world size, mini-map (turned sideways like the landscape full map, scrolling with the player) and full
map follow automatically.

**Room config — `src/data/rooms.ts`.** `ROOMS` is one typed list. Each room has:

- `bounds` (x/y/width/height) and `doorSide` — walls and the door gap are generated from these.
- `spawn` — the safe point just inside the door, used for the first spawn (Reception) and for
  every "Go Here" auto-walk. On startup the game warns in the console if a spawn ends up inside
  a wall or furniture, so layout edits can't silently break travel.
- `furniture` — list of `{ kind, x, y, variant }`. Collision boxes come from
  `src/data/furniture.ts`, so placing furniture automatically makes it solid.
- `npcs` — seated visitor placeholders.
- `interactables` — position, trigger radius (optionally measured from an object's edge via
  `area`), label, icon and dialog text.
- `color`, `floor`, `icon`, `signX`, `description` — wall paint, floor pattern, signs and the
  full-map detail text.

Walls, collisions, the mini-map, the full map and save validation all derive from this one file.

**Replacing placeholder art.** There are **no image files**: everything is drawn as vector
Graphics in `src/art/`, which stays sharp on high-DPI phones. To swap in real art:

1. Load sprites in `BootScene.preload()`.
2. Furniture: in `createFurniture()` (`art/furniture.ts`) replace the Graphics drawing with
   `scene.add.image(x, bottom, key).setOrigin(0.5, 1)`. Positions, collisions and depth sorting
   stay the same.
3. Characters: the player already uses a `.webp` walk-cycle spritesheet (see below). Visitors still
   use `drawPatient` (`art/characters.ts`).
4. Floors and walls: replace `drawFloor` / `drawWall` (`art/environment.ts`) with tile sprites or
   one background image per room.
5. Colours: Phaser-side colours live in `art/palette.ts` (outlines are derived automatically by
   `outline()`); HUD/modal colours are CSS variables at the top of `style.css`.

### Image assets (.webp) and the player spritesheet

Image assets are listed in **`src/data/assets.ts`** and loaded in `BootScene`. Files live in
`public/assets/` and are copied as-is into `dist/`. If a file is missing or fails to load, the game
logs a warning and falls back to the vector placeholder, so art can be replaced piece by piece.

Playable characters are listed in `CHARACTERS` in `src/data/assets.ts`: the female doctor in a
lavender hijab (`public/assets/characters/doctor-hijab-walk.webp`) and the male doctor with purple
accents (`doctor-man-walk.webp`). Each is a 3 x 4 grid with rows front / left / right / back and
columns standing / step / step; in game each direction plays stand -> step -> stand -> step.
Adding an entry to `CHARACTERS` adds it to the select screen automatically.

### Clinic NPCs

Defined in **`src/data/npcs.ts`** (positions are room-relative, like furniture), drawn by
`src/entities/Npc.ts`:

| Who | Where | Behaviour |
|---|---|---|
| Receptionist | behind the reception counter | blinks, waves when the player comes close |
| Pharmacist | behind the pharmacy counter (seen through its screen) | blinks, holds out a bag when the player comes close |
| 6 seated visitors (mother & son, teen & youth, Paati & Tok Wan) | waiting-room chairs and bench | blink, now and then use a phone / fan / newspaper |
| Storekeeper (Encik Ravi) | Storage | blinks, checks his clipboard; solid |
| Nurse Jason | walks up and down the hallway | stops and faces the player when close |
| Nurse Amy | walks around the Care Room | same |

Each person has a short, friendly, non-clinical line (`talk`). Their "…" bubble only appears
when they are the nearest interactable, so the waiting room isn't covered in bubbles. If an NPC's
sheet fails to load, seated visitors fall back to the vector drawing and others are left out.

### Staff directory

The **Staff** button under the mini-map opens a staff ID card for each team member
(`src/data/staff.ts`): a sharp portrait photo (`public/assets/portraits/`, made from the full-size
AI source sheet with `tools/make-portrait.py`, because the in-game sprites are too small to show
this large), name, role, staff number,
where to find them, what they can help with and a fun fact. Swipe or use the arrows to browse.
**Find** takes the player to that person (front of the counter for the receptionist and
pharmacist). The player's own doctor isn't listed (that belongs on their profile); the other
doctor appears as an off-duty colleague.

### Making spritesheets from AI images

Any AI-generated grid of figures (any spacing, white or transparent background):

```bash
pip install pillow numpy scipy
# walking character: rows front/left/right/back, cols stand/step/step
python tools/slice-sprite-sheet.py "art-source/characters/<source>.webp" public/assets/characters/<name>.webp preview.png
# one standing character, 3 poses (idle, blink, action)
python tools/slice-sprite-sheet.py <source> <out.webp> preview.png --rows 1
# two seated characters, one per row
python tools/slice-sprite-sheet.py <source> <out.webp> preview.png --rows 2
```

To change a fabric colour first (the doctor's lavender hijab was recoloured from the original
blue sheet this way), run `tools/recolor-fabric.py` — see the usage notes at the top of the file.

The slicer finds each figure, removes a white background if there is one, cleans up specks and
halos left by AI background removal, puts every frame's feet on the same baseline with the head
centred, and prints the `frameWidth` / `frameHeight` /
`contentHeight` / `padding` values to copy into `src/data/assets.ts`. `displayHeight` there sets
the character's on-screen size. The original AI sheets are kept in `art-source/characters/` as
source art (they are not bundled).

### Embedding the web build into a mobile WebView (for later)

1. Run `npm run build`; the static output lands in `dist/` (`index.html` + `assets/`).
2. Host `dist/` on your app's CDN/static host, or bundle it locally and point the native
   WebView (Android `WebView` / iOS `WKWebView`) at the `index.html` file URL.
3. The page is already portrait-safe-area aware (`env(safe-area-inset-*)` in `style.css`) and
   disables page scroll/zoom gestures (`touch-action: none`), which matters inside a WebView.
4. `localStorage` persistence works the same inside a WebView, as long as the WebView doesn't
   run in a private/incognito mode that clears storage between sessions.
5. No API keys or backend are required for Phase 1. The only network request is the optional
   Nunito web font (Google Fonts) in `index.html`; offline it falls back to the system font.
   Remove that `<link>` or self-host the font if the host app must be fully offline.

## Manual testing checklist

- [ ] `npm install && npm run dev` starts without errors; `npm run build` succeeds.
- [ ] Portrait layout looks correct at common phone sizes (e.g. 360×800, 390×844, 428×926);
      no HUD button is cut off or unreachable.
- [ ] Joystick moves the player smoothly in 8 directions; arrow keys/WASD also work on desktop.
- [ ] Player cannot walk through any wall or through the gap outside a door opening.
- [ ] All eleven rooms are reachable on foot via the central corridor.
- [ ] Standing near an object/NPC shows the Interact button; walking away hides it.
- [ ] Tapping Interact opens the correct placeholder dialog; Close dismisses it and movement
      resumes.
- [ ] The mini-map (top-right) tracks the player dot continuously while walking.
- [ ] Tapping the mini-map opens the full map; tapping a room highlights it and shows its name.
- [ ] Selecting the player's current room disables "Go Here"; selecting another room and
      tapping "Go Here" closes the map and the player walks to that room's entrance (moving the
      joystick / a key cancels the walk).
- [ ] After any modal closes, joystick/keyboard movement and Interact continue to work.
- [ ] Reload the page mid-game: the player reappears at the last saved position/room.
- [ ] Clear `localStorage` (or corrupt the saved value) and reload: the game falls back to a
      safe Reception spawn instead of crashing.
- [ ] Browser console shows no errors during the full flow above.

## Explicitly out of scope (Phase 1)

Patient diagnosis, product recommendation, real medicines/treatment, scoring/ranking/accounts/
cloud saves, the three existing mini-games (Arcade Room is a placeholder entrance only),
multiple floors, NPC pathfinding, inventory, production art, and real-brand content. See the
coding brief for the full list.

## Remaining Phase 2 tasks (not implemented here)

- Real consultation/examination interactions in the Care Room (non-diagnostic, reviewed content).
- Patient registration/queue flow at Reception.
- NPC dialogue trees for the Waiting Area (currently a single static line).
- Stock/collection mechanics in Storage.
- Wiring the Arcade Room entrance to the existing Grow Bloom / Catch the Gust / Delivery Dash
  mini-games.
- Mission list, career ranks and leaderboard in the Staff Office (local-only first, then backend).
- Swapping the vector placeholder art for production art/sprites (see "Replacing placeholder
  art" above for the exact touch points).
- Backend-backed save, accounts, and production WebView integration in the host app.
