import Phaser from "phaser";
import { OUTFITS, outfitCount, recolorPixels } from "../art/outfits";
import type { CharacterSheet, SheetDef } from "../data/assets";
import type { PatientIdentity } from "../data/patients";

// Game side of art/outfits.ts: builds a patient's sprite sheets in another outfit colour the
// first time they are needed (a recoloured copy of the loaded sheet, plus its walk animations),
// then reuses them. Outfit 0 is the original art.

/** Next outfit after the one worn last time (first visit: the original). */
export function nextOutfit(patientId: string, lastOutfit: number | null | undefined): number {
  return ((lastOutfit ?? -1) + 1) % outfitCount(patientId);
}

/** A copy of `sheet` with the garment recoloured, registered under `key`; false if it can't be made. */
function buildSheet(scene: Phaser.Scene, sheet: SheetDef, key: string, patientId: string, outfit: number, sitting: boolean): boolean {
  if (scene.textures.exists(key)) return true;
  const def = OUTFITS[patientId];
  const variant = def?.variants[outfit - 1];
  if (!def || !variant || !scene.textures.exists(sheet.key)) return false;
  const source = scene.textures.get(sheet.key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  recolorPixels(img.data, canvas.width, canvas.height, sheet.frameHeight, def, variant, sitting);
  ctx.putImageData(img, 0, 0);
  const texture = scene.textures.addSpriteSheet(key, canvas as unknown as HTMLImageElement, {
    frameWidth: sheet.frameWidth,
    frameHeight: sheet.frameHeight,
  });
  return !!texture;
}

/** Walk cycle per direction for a recoloured walk sheet (same as BootScene does for the originals). */
function addWalkAnims(scene: Phaser.Scene, sheet: CharacterSheet): void {
  for (const [dir, row] of Object.entries(sheet.rows)) {
    const key = `${sheet.key}-walk-${dir}`;
    if (scene.anims.exists(key)) continue;
    const first = row * 3;
    scene.anims.create({
      key,
      frames: scene.anims.generateFrameNumbers(sheet.key, { frames: [first, first + 1, first, first + 2] }),
      frameRate: sheet.frameRate,
      repeat: -1,
    });
  }
}

/** The patient's walk and sit sheets in the given outfit (the originals if it can't be made). */
export function outfitSheets(scene: Phaser.Scene, patient: PatientIdentity, outfit: number): { walk: CharacterSheet; sit: SheetDef } {
  const original = { walk: patient.walk, sit: patient.sit };
  if (!outfit || !OUTFITS[patient.id]) return original;
  try {
    const walk: CharacterSheet = { ...patient.walk, key: `${patient.walk.key}-outfit${outfit}` };
    const sit: SheetDef = { ...patient.sit, key: `${patient.sit.key}-outfit${outfit}` };
    if (!buildSheet(scene, patient.walk, walk.key, patient.id, outfit, false)) return original;
    if (!buildSheet(scene, patient.sit, sit.key, patient.id, outfit, true)) return original;
    addWalkAnims(scene, walk);
    return { walk, sit };
  } catch (error) {
    console.warn(`[outfits] could not make outfit ${outfit} for ${patient.id}`, error);
    return original;
  }
}
