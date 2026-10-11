# Eczema Care Hero — Phase 1

Mobile-first walkable clinic prototype, built with **Phaser 3 + TypeScript + Vite**, per the
Phase 1 Claude Coding Brief. Only the features in that brief are implemented — no diagnosis,
treatment, ranking, accounts, or mini-game integration yet.

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
- **Character**: on first launch the player picks the female or male doctor; the round face
  button at the top-left of the HUD changes character at any time. The choice is saved.
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
pharmacist). The chosen doctor's card is marked "You"; the other doctor is "Off duty".

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
