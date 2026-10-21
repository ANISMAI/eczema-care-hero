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
  - frame langkah (lajur 2 dan 3) menunjukkan kaki yang sama melangkah — terutama pandangan belakang
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
Column 1: standing still, both feet together.
WALK CYCLE (very important): column 2 and column 3 must be DIFFERENT steps, mirror opposites of
each other, so the legs clearly alternate. Column 2: LEFT foot forward, right foot back, right arm
swinging forward. Column 3: RIGHT foot forward, left foot back, left arm swinging forward. In the
back view (row 4) a different heel is lifted in column 2 and column 3.
Use chibi body proportions exactly like the reference: a big round head about one third of the
total height, a short chubby body and short legs. Keep any carried item in the same hand in every
frame of a row.

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

Kalau frame langkah pandangan depan/belakang melangkah dengan kaki yang sama, dan watak tu tak
pegang barang di sebelah tangan, tambah `--mirror-steps 0,3` pada arahan walk sheet (frame langkah
kedua dibina daripada cerminan yang pertama). Wong dan Farid dipotong dengan pilihan ni.

Lepas tu masukkan nombor `frameWidth` yang dicetak ke dalam `src/data/assets.ts`, dan tukar watak
tu dalam `src/data/patients.ts` (buang `tint`, set `portrait`). Watak yang belum siap guna sprite
Amina yang diwarnakan, dengan tag nama, sebagai pengganti sementara.

---

# Doktor (watak pemain) — 4 watak baru

Pemain boleh pilih doktor Melayu, Cina atau India, lelaki atau perempuan.

- **Doktor Melayu** boleh solat di Surau (pose doa).
- **Doktor Cina dan India** boleh masuk Surau sahaja; tiada tindakan "Pray" pada sejadah.
- Suis **Prayer time reminders** dalam Settings hanya mengawal **pengumuman** waktu solat.

| | Perempuan | Lelaki |
|---|---|---|
| Melayu | ✅ ada (`doctor-hijab`) | ✅ ada (`doctor-man`) |
| Cina | ✅ `doctor-chinese-woman` (Dr. Jasmine) | ✅ `doctor-chinese-man` (Dr. Wei Jie) |
| India | ✅ `doctor-indian-woman` (Dr. Kavitha) | ✅ `doctor-indian-man` (Dr. Arvind) |

Setiap doktor baru perlukan **1 imej sahaja**, iaitu walk sheet (tiada pray sheet):

| Watak | Walk sheet (4 × 3) |
|---|---|
| Cina, perempuan | `doctor-chinese-woman-walk-sheet.png` |
| Cina, lelaki | `doctor-chinese-man-walk-sheet.png` |
| India, perempuan | `doctor-indian-woman-walk-sheet.png` |
| India, lelaki | `doctor-indian-man-walk-sheet.png` |

**Lampirkan sebagai rujukan:** `art-source/characters/doctor-man-walk-sheet.webp` (lelaki) atau
`doctor-hijab-walk-sheet.webp` (perempuan), supaya gaya dan pakaian sama.

## Prompt C — Walk sheet doktor (4 baris × 3 lajur)

Ganti `[DOCTOR]`.

```
Chibi character sprite sheet for a cozy mobile clinic game, matching the attached doctor
reference EXACTLY in style, proportions and outfit design: cute chibi proportions with a big
round head about one third of the total height, a short body and short legs, large round brown
eyes, small smile, thick dark-brown outline, soft flat pastel colours with gentle cel shading.

Character: [DOCTOR]
Outfit (same as the reference doctors): a white doctor's coat over a lavender-purple shirt,
a lavender stethoscope around the neck, a small ID badge, navy trousers, dark shoes.

Layout: a clean grid of 4 rows x 3 columns, 12 figures total, evenly spaced with clear empty
space between every figure, all figures the same size and scale.
Row 1: facing the viewer (front view).
Row 2: facing left (side view, walking to the left).
Row 3: facing right (side view, walking to the right).
Row 4: back view (walking away from the viewer).

WALK CYCLE (very important):
Column 1: standing still, both feet together.
Column 2: LEFT foot forward, right foot back, right arm swinging forward.
Column 3: RIGHT foot forward, left foot back, left arm swinging forward.
Column 2 and column 3 must be DIFFERENT, mirror-opposite steps so the legs clearly alternate,
in every row including the side views and the back view.

Transparent background (or pure white). No floor, no shadows, no glow, no text, no labels,
no grid lines, no frames. Figures must not touch or overlap.
```

## Penerangan doktor

### Doktor Cina, perempuan
- **DOCTOR:** `a friendly Chinese-Malaysian woman doctor in her early 30s, shoulder-length straight black hair in a neat low ponytail with a soft side fringe`

### Doktor Cina, lelaki
- **DOCTOR:** `a friendly Chinese-Malaysian man doctor in his early 30s, short neat black hair with a light side part, thin round glasses`

### Doktor India, perempuan
- **DOCTOR:** `a warm Indian-Malaysian woman doctor in her early 30s, long dark wavy hair in a neat low bun, small gold stud earrings`

### Doktor India, lelaki
- **DOCTOR:** `a cheerful Indian-Malaysian man doctor in his early 30s, short wavy black hair, neat trimmed beard`

## Lepas imej siap

Letak PNG dalam `public/assets/characters/` macam biasa, dan Claude akan tukar ke `.webp`, semak
langkah kaki, potong, dan masukkan ke dalam skrin pilih doktor (6 pilihan, `prays: false` untuk
doktor Cina dan India dalam `src/data/assets.ts`). Atau potong sendiri:

```bash
node tools/slice-sprite-sheet.mjs art-source/characters/doctor-chinese-woman-walk-sheet.webp public/assets/characters/doctor-chinese-woman-walk.webp preview.png --rows 4 --cols 3
```
