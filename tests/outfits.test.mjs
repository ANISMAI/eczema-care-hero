import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { OUTFITS, outfitCount, recolorPixels } from '../src/art/outfits.ts';

// Recolouring a patient's clothes must never touch the head (face, skin, hair, hijab): checked on
// the real sprite sheets, every patient, every outfit, walking and sitting.
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const FRAME_H = 180;

async function sheet(file) {
  const { data, info } = await sharp(new URL(`../public/assets/characters/${file}`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** Pixels in the top `fraction` of every frame that differ between two buffers. */
function headChanges(a, b, width, height, fraction) {
  let n = 0;
  for (let y = 0; y < height; y++) {
    if ((y % FRAME_H) / FRAME_H >= fraction) continue;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++;
    }
  }
  return n;
}

for (const id of Object.keys(OUTFITS)) {
  test(`${id}: only the ${OUTFITS[id].garment} changes colour`, async () => {
    const def = OUTFITS[id];
    assert.equal(outfitCount(id), 1 + def.variants.length);
    for (const [file, sitting, head] of [[`${id}-walk.webp`, false, 0.42], [`${id}-sit.webp`, true, 0.36]]) {
      const s = await sheet(file);
      for (const variant of def.variants) {
        const copy = Buffer.from(s.data);
        const changed = recolorPixels(copy, s.width, s.height, FRAME_H, def, variant, sitting);
        assert.ok(changed > 500, `${file}: the garment was found (${changed} px)`);
        assert.equal(headChanges(s.data, copy, s.width, s.height, head), 0, `${file}: head untouched`);
      }
    }
  });
}

test('patients without an outfit definition keep one outfit', () => {
  assert.equal(outfitCount('nobody'), 1);
});
