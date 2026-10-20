# Prompt Watak Pesakit — Phase 3

Prompt untuk menjana 7 watak pesakit baru supaya sama gaya dengan Amina. Setiap watak perlukan
**2 imej**: satu *walk sheet* (4 × 3) dan satu *sit sheet* (1 × 3). Jumlah: **14 imej**.

## Sebelum mula

- Lampirkan **kedua-dua sheet Amina** sebagai *style reference* setiap kali menjana:
  - `art-source/characters/patient-amina-walk-sheet.webp`
  - `art-source/characters/patient-amina-sit-sheet.webp`
- Jana **walk sheet dulu**. Semasa menjana sit sheet, lampirkan walk sheet watak tu juga, supaya
  warna pakaian sama.
- Latar mesti **putih kosong**, dan figura **tidak bersentuhan**. Skrip pemotong sprite
  (`tools/slice-sprite-sheet.py`) bergantung pada dua perkara ini.
- Jana semula kalau:
  - bilangan figura salah (walk = 12, sit = 3)
  - arah tertukar (baris mesti ikut urutan: depan → kiri → kanan → belakang)
  - ada bayang, lantai, kerusi, teks atau garis grid
  - pakaian atau rupa berubah antara figura

## Nama fail

Simpan dalam `art-source/characters/`:

| Watak | Walk sheet | Sit sheet |
|---|---|---|
| Daniel | `patient-daniel-walk-sheet.png` | `patient-daniel-sit-sheet.png` |
| Siti | `patient-siti-walk-sheet.png` | `patient-siti-sit-sheet.png` |
| Sarah | `patient-sarah-walk-sheet.png` | `patient-sarah-sit-sheet.png` |
| Uncle Wong | `patient-wong-walk-sheet.png` | `patient-wong-sit-sheet.png` |
| Farid | `patient-farid-walk-sheet.png` | `patient-farid-sit-sheet.png` |
| Mak Cik Rohana | `patient-rohana-walk-sheet.png` | `patient-rohana-sit-sheet.png` |
| Suresh | `patient-suresh-walk-sheet.png` | `patient-suresh-sit-sheet.png` |

Format `.png` atau `.webp` kedua-duanya boleh.

---

## Prompt A — Walk sheet (4 baris × 3 lajur)

Ganti `[CHARACTER]` dengan penerangan watak.

```
Chibi character sprite sheet for a cozy mobile clinic game, matching the attached reference
style exactly: cute chibi proportions (head about 1/3 of body height), large round brown eyes,
small smile, thick dark-brown outline, soft flat pastel colours with gentle cel shading,
full body, same character design in every frame.

Character: [CHARACTER]

Layout: a clean grid of 4 rows x 3 columns, 12 figures total, evenly spaced with clear white
space between every figure, all figures the same size and scale.
Row 1: facing the viewer (front view).
Row 2: facing left (side view, walking to the left).
Row 3: facing right (side view, walking to the right).
Row 4: back view (walking away from the viewer).
Column 1: standing still. Column 2: walking, left foot forward. Column 3: walking, right foot forward.

Pure white background. No floor, no shadows, no text, no labels, no grid lines, no frames.
Figures must not touch or overlap.
```

## Prompt B — Sit sheet (1 baris × 3 pose)

Ganti `[CHARACTER]` dan `[ACTION]`.

```
Chibi character pose sheet for a cozy mobile clinic game, matching the attached reference style
exactly: cute chibi proportions, large round brown eyes, thick dark-brown outline, soft flat
pastel colours with gentle cel shading. Same character design in all three poses.

Character: [CHARACTER]

Layout: 1 row of 3 figures, evenly spaced, same size, all facing the viewer, sitting upright
on an invisible chair (do NOT draw the chair), hands resting on the lap, feet on the ground.
Pose 1: relaxed, gentle smile, eyes open.
Pose 2: identical to pose 1 but eyes closed (a blink).
Pose 3: [ACTION]

Pure white background. No chair, no floor, no shadows, no text, no labels.
Figures must not touch or overlap.
```

---

## Watak

### 1. Amina — sudah ada ✅

### 2. Daniel
Lelaki Cina, ~28 tahun, pekerja pejabat.
- **CHARACTER:** `a friendly Chinese-Malaysian man in his late 20s, neat short black hair, thin rectangular glasses, light blue short-sleeved collared shirt tucked into dark grey trousers, black shoes, a small black sling bag across his body`
- **ACTION:** `looking down at a smartphone held in both hands`

### 3. Siti
Remaja perempuan Melayu, ~14 tahun, pakaian sekolah.
- **CHARACTER:** `a cheerful Malay schoolgirl about 14 years old, white school tudung, white long-sleeved baju kurung top with a navy blue long skirt, white sneakers, a light purple school backpack`
- **ACTION:** `reading a small book on her lap`

### 4. Sarah
Wanita India, ~40 tahun.
- **CHARACTER:** `a warm Indian-Malaysian woman around 40, long dark hair in a low side braid, mustard-yellow long tunic top over maroon trousers, simple flat sandals, small tan handbag on her shoulder`
- **ACTION:** `gently rubbing the back of one hand with the other`

### 5. Uncle Wong
Warga emas lelaki Cina, ~68 tahun.
- **CHARACTER:** `a kind elderly Chinese-Malaysian man around 68, short grey hair thinning on top, round reading glasses, beige polo shirt, brown trousers, dark sandals, slightly stooped but cheerful`
- **ACTION:** `fanning himself with a folded paper fan`

### 6. Farid
Lelaki Melayu, ~35 tahun, pekerja luar.
- **CHARACTER:** `a sturdy Malay man around 35, short black hair with light stubble, olive-green work shirt with rolled-up sleeves, khaki cargo trousers, brown work boots`
- **ACTION:** `looking at his own palms, slightly concerned`

### 7. Mak Cik Rohana
Warga emas wanita Melayu, ~60 tahun.
- **CHARACTER:** `a gentle elderly Malay woman around 60, cream-coloured tudung, maroon baju kurung with a small white floral pattern, flat brown slippers, holding a small woven basket bag`
- **ACTION:** `holding a tasbih with both hands on her lap, smiling softly`

### 8. Suresh
Lelaki India, ~45 tahun.
- **CHARACTER:** `a friendly Indian-Malaysian man around 45, neat side-parted black hair, thick moustache, white long-sleeved shirt with sleeves rolled up, navy trousers, brown shoes, a wristwatch, holding a thin document folder`
- **ACTION:** `checking his wristwatch`

---

## Senarai semak

| Watak | Walk sheet | Sit sheet |
|---|---|---|
| Amina | ✅ | ✅ |
| Daniel | ✅ | ✅ |
| Siti | ✅ | ✅ |
| Sarah | ✅ | ✅ |
| Uncle Wong | ✅ | ✅ |
| Farid | ✅ | ✅ |
| Mak Cik Rohana | ✅ | ✅ |
| Suresh | ✅ | ✅ |

## Kenapa nama ni, bukan nama dalam brief Phase 3?

Brief mencadangkan Daniel, Mei Ling, Ravi, Sarah, Adam, Siti dan Uncle Lim sebagai contoh. Tapi
**Mei Ling** dan **Adam** dah wujud sebagai pelawat yang duduk di Waiting Area, **Ravi** ialah
storekeeper, dan **Uncle Lim** boleh keliru dengan Dr. Lim. Nama lain boleh dipilih. Kalau
tukar nama, cuma pastikan ia tak bertembung dengan watak sedia ada.

## Lepas imej siap

Simpan sheet sumber dalam `art-source/characters/` (bukan `public/`), kemudian potong dan buat potret
(Node.js, tak perlu Python):

```bash
node tools/slice-sprite-sheet.mjs art-source/characters/patient-suresh-walk-sheet.webp public/assets/characters/suresh-walk.webp preview.png --rows 4 --cols 3
node tools/slice-sprite-sheet.mjs art-source/characters/patient-suresh-sit-sheet.webp public/assets/characters/suresh-sit.webp preview.png --rows 1 --cols 3
node tools/make-portrait.mjs art-source/characters/patient-suresh-walk-sheet.webp public/assets/portraits/suresh.webp
```

Lepas tu masukkan nombor `frameWidth` yang dicetak ke dalam `src/data/assets.ts`, dan tukar watak
tu dalam `src/data/patients.ts` (buang `tint`, set `portrait`). Watak yang belum siap guna sprite
Amina yang diwarnakan, dengan tag nama, sebagai pengganti sementara.
