import { ROOMS, WORLD_BOUNDS, type RoomId } from "./rooms";

const SAVE_KEY = "eczema-care-hero-save-v1";
const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  playerX: number;
  playerY: number;
  currentRoomId: RoomId;
  settings: {
    musicOn: boolean;
  };
}

function defaultSave(): SaveData {
  const reception = ROOMS[0];
  return {
    version: SAVE_VERSION,
    playerX: reception.spawn.x,
    playerY: reception.spawn.y,
    currentRoomId: reception.id,
    settings: { musicOn: true },
  };
}

function isValid(data: unknown): data is SaveData {
  if (!data || typeof data !== "object") return false;
  const d = data as Partial<SaveData>;
  if (typeof d.playerX !== "number" || Number.isNaN(d.playerX)) return false;
  if (typeof d.playerY !== "number" || Number.isNaN(d.playerY)) return false;
  if (d.playerX < WORLD_BOUNDS.x || d.playerX > WORLD_BOUNDS.x + WORLD_BOUNDS.width) return false;
  if (d.playerY < WORLD_BOUNDS.y || d.playerY > WORLD_BOUNDS.y + WORLD_BOUNDS.height) return false;
  if (!ROOMS.some((r) => r.id === d.currentRoomId)) return false;
  return true;
}

/** Loads the saved game, falling back to a safe default on any invalid/missing data. */
export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!isValid(parsed)) return defaultSave();
    return { ...defaultSave(), ...parsed };
  } catch {
    return defaultSave();
  }
}

export function saveGame(data: SaveData): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (e.g. private mode) — fail silently, gameplay continues unsaved.
  }
}
