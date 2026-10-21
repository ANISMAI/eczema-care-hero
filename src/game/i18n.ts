import { language } from "./settings";

// Interface translations (title menu, HUD, panels, room names). Patient dialogue, case content
// and event stories are still English only; they are content and get translated in a later
// phase (with a review of the clinical wording).
//
// Usage: t("menu.play"), t("toast.heading", { place: "Pharmacy" }). The language is read once at
// start-up; changing it in the title menu reloads the page so every label follows.

export type Lang = "en" | "ms";

/** `code`: a short text badge (flag emoji do not show on Windows). */
export const LANGUAGES: { id: Lang; name: string; code: string }[] = [
  { id: "en", name: "English", code: "EN" },
  { id: "ms", name: "Bahasa Melayu", code: "BM" },
];

const STRINGS = {
  // ---------- title menu ----------
  "menu.tagline": { en: "A cosy clinic game", ms: "Permainan klinik yang santai" },
  "menu.play": { en: "ENTER", ms: "MASUK" },
  "menu.continue": { en: "Continue · Day {day}", ms: "Sambung · Hari {day}" },
  "menu.howTo": { en: "How to play", ms: "Cara main" },
  "menu.badges": { en: "Badges", ms: "Lencana" },
  "menu.language": { en: "Language", ms: "Bahasa" },
  "menu.settings": { en: "Settings", ms: "Tetapan" },
  "menu.done": { en: "Done", ms: "Selesai" },
  "menu.back": { en: "Back", ms: "Kembali" },
  "menu.next": { en: "Next", ms: "Seterusnya" },
  "menu.gotIt": { en: "Got it!", ms: "Faham!" },

  "settings.sound": { en: "Sound", ms: "Bunyi" },
  "settings.soundHint": { en: "Announcement chimes", ms: "Loceng pengumuman" },
  "settings.prayer": { en: "Prayer time reminders", ms: "Peringatan waktu solat" },
  "settings.prayerHint": { en: "Announcements at prayer times.", ms: "Pengumuman pada waktu solat." },
  "settings.reset": { en: "Start again", ms: "Mula semula" },
  "settings.resetHint": { en: "Back to Day 1. Your progress on this device is erased.", ms: "Kembali ke Hari 1. Kemajuan anda pada peranti ini akan dipadam." },
  "settings.resetBtn": { en: "Reset", ms: "Set semula" },
  "settings.resetConfirm": { en: "Tap again to confirm", ms: "Ketik sekali lagi untuk sahkan" },

  "language.title": { en: "Language", ms: "Bahasa" },
  "language.note": {
    en: "Menus and buttons change language. Patient conversations are in English for now.",
    ms: "Menu dan butang akan bertukar bahasa. Perbualan pesakit masih dalam bahasa Inggeris buat masa ini.",
  },

  "badges.title": { en: "Badges", ms: "Lencana" },
  "badges.soon": { en: "Badge collection coming soon", ms: "Koleksi lencana akan datang" },
  "badges.hint": {
    en: "Earn badges as you care for patients and help around the clinic. Keep an eye on this shelf!",
    ms: "Kumpul lencana dengan merawat pesakit dan membantu di klinik. Nantikan rak ini!",
  },

  "howTo.title": { en: "How to play", ms: "Cara main" },
  "howTo.1.title": { en: "Walk around the clinic", ms: "Berjalan di sekitar klinik" },
  "howTo.1.text": {
    en: "Use the joystick (or arrow keys) to walk. Tap the map to travel to any room.",
    ms: "Guna joystick (atau kekunci anak panah) untuk berjalan. Ketik peta untuk ke mana-mana bilik.",
  },
  "howTo.2.title": { en: "Call your patients in", ms: "Panggil pesakit masuk" },
  "howTo.2.text": {
    en: "Patients register with Nurul and wait in the Waiting Area. Call the next one in at the Consultation desk.",
    ms: "Pesakit mendaftar dengan Nurul dan menunggu di Ruang Menunggu. Panggil pesakit seterusnya di meja Konsultasi.",
  },
  "howTo.3.title": { en: "Listen, look and care", ms: "Dengar, periksa dan rawat" },
  "howTo.3.text": {
    en: "Ask questions, check the skin with Dr. Lim, then use the right tool, gently. Dr. Lim always decides the care plan.",
    ms: "Tanya soalan, periksa kulit bersama Dr. Lim, kemudian guna alat yang betul dengan lembut. Dr. Lim yang menentukan pelan rawatan.",
  },
  "howTo.4.title": { en: "Mind the waiting queue", ms: "Perhatikan barisan menunggu" },
  "howTo.4.text": {
    en: "The rings around waiting faces show their patience. If it runs out, they'll come back another day.",
    ms: "Cincin di sekeliling muka pesakit menunjukkan kesabaran mereka. Jika habis, mereka akan datang lain hari.",
  },
  "howTo.5.title": { en: "Help around the clinic", ms: "Bantu di sekitar klinik" },
  "howTo.5.text": {
    en: "Sometimes the team needs a hand (look for the orange !). It's optional and earns bonus coins.",
    ms: "Kadang-kadang pasukan perlukan bantuan (cari tanda ! oren). Ia pilihan dan memberi syiling bonus.",
  },
  "howTo.6.title": { en: "End of the day", ms: "Penghujung hari" },
  "howTo.6.text": {
    en: "The clinic closes at 5 PM, or close it yourself at the Staff Office desk. Then see your day's results.",
    ms: "Klinik ditutup jam 5 petang, atau tutup sendiri di meja Pejabat Staf. Kemudian lihat keputusan hari anda.",
  },

  // ---------- before the shift ----------
  "brief.title": { en: "Day {day} shift", ms: "Shift Hari {day}" },
  "brief.subtitle": { en: "{time} · The clinic opens at 8:00 AM", ms: "{time} · Klinik dibuka jam 8:00 pagi" },
  "brief.today": { en: "On duty today", ms: "Bertugas hari ini" },
  "brief.opens": { en: "Patients start arriving once you start your shift.", ms: "Pesakit mula tiba sebaik anda memulakan shift." },
  "brief.patients": { en: "Call them in at the Consultation desk.", ms: "Panggil mereka masuk di meja Konsultasi." },
  "brief.trays": { en: "Care trays: {clean}/{total} clean", ms: "Dulang rawatan: {clean}/{total} bersih" },
  "brief.prayerOn": { en: "Prayer time reminders: on", ms: "Peringatan waktu solat: hidup" },
  "brief.prayerOff": { en: "Prayer time reminders: off", ms: "Peringatan waktu solat: mati" },
  "brief.start": { en: "Start shift", ms: "Mula shift" },
  "brief.explore": { en: "Look around first", ms: "Teroka dulu" },
  "clockin.scanning": { en: "Scanning…", ms: "Mengimbas…" },
  "clockin.done": { en: "Clocked in!", ms: "Daftar masuk berjaya!" },
  "clockin.skip": { en: "Tap to skip", ms: "Ketik untuk langkau" },
  "brief.notOpen": { en: "The clinic isn't open yet. Start your shift first!", ms: "Klinik belum dibuka. Mulakan shift anda dahulu!" },

  // ---------- doctor picker ----------
  "picker.title": { en: "Choose your doctor", ms: "Pilih doktor anda" },
  "picker.start": { en: "Start", ms: "Mula" },
  "picker.choose": { en: "Choose", ms: "Pilih" },
  "picker.cancel": { en: "Cancel", ms: "Batal" },
  "picker.prayerHint": {
    en: "Gentle announcements at prayer times. You can change this later in Settings.",
    ms: "Pengumuman lembut pada waktu solat. Boleh ditukar kemudian dalam Tetapan.",
  },

  // ---------- HUD ----------
  "hud.map": { en: "MAP", ms: "PETA" },
  "hud.staff": { en: "Staff", ms: "Staf" },
  "hud.interact": { en: "Interact", ms: "Tindakan" },
  "hud.go": { en: "Go ›", ms: "Pergi ›" },
  "hud.next": { en: "Next", ms: "Seterusnya" },
  "hud.nextPatient": { en: "Next patient", ms: "Pesakit seterusnya" },
  "hud.callNext": { en: "Call {name} in at the Consultation desk", ms: "Panggil {name} masuk di meja Konsultasi" },
  "hud.waiting": { en: "Waiting", ms: "Menunggu" },
  "hud.day": { en: "Day {day}", ms: "Hari {day}" },
  "hud.hallway": { en: "Hallway", ms: "Lorong" },
  "toast.heading": { en: "Heading to {place}…", ms: "Menuju ke {place}…" },
  "toast.walking": { en: "Walking to {place}…", ms: "Berjalan ke {place}…" },
  "toast.goingTo": { en: "Going to {name}…", ms: "Pergi ke {name}…" },
  "toast.found": { en: "Found {name}!", ms: "Jumpa {name}!" },
  "toast.dayStart": { en: "Day {day}: the clinic is open! Patients will arrive soon", ms: "Hari {day}: klinik dibuka! Pesakit akan tiba tidak lama lagi" },

  // ---------- event notice ----------
  "event.optional": { en: "Optional · bonus coins", ms: "Pilihan · syiling bonus" },
  "event.later": { en: "Later", ms: "Nanti" },
  "event.dismiss": { en: "Dismiss", ms: "Abaikan" },

  // ---------- full map ----------
  "map.title": { en: "Clinic Map", ms: "Peta Klinik" },
  "map.entrance": { en: "Entrance", ms: "Pintu masuk" },
  "map.youAreHere": { en: "You are here", ms: "Anda di sini" },
  "map.close": { en: "Close", ms: "Tutup" },
  "map.goHere": { en: "Go Here", ms: "Pergi" },
  "map.alreadyHere": { en: "You are already here.", ms: "Anda sudah berada di sini." },
  "map.choose": { en: "Choose a destination", ms: "Pilih destinasi" },
  "map.youAreIn": { en: "You are in {room}. Tap a room to travel.", ms: "Anda di {room}. Ketik bilik untuk ke sana." },
  "map.tapRoom": { en: "Tap a room on the map.", ms: "Ketik bilik pada peta." },
  "map.help": { en: " ❗ Someone here needs a hand (optional).", ms: " ❗ Seseorang di sini perlukan bantuan (pilihan)." },

  // ---------- profile & staff ----------
  "profile.title": { en: "My Profile", ms: "Profil Saya" },
  "profile.change": { en: "Change doctor", ms: "Tukar doktor" },
  "profile.exit": { en: "Exit", ms: "Keluar" },
  "profile.exitTitle": { en: "Do you really want to exit?", ms: "Anda pasti mahu keluar?" },
  "profile.exitDescription": {
    en: "You'll return to the main menu. An unfinished shift will restart when you play again.",
    ms: "Anda akan kembali ke menu utama. Shift yang belum selesai akan bermula semula apabila anda bermain lagi.",
  },
  "profile.cancelExit": { en: "Cancel", ms: "Batal" },
  "profile.confirmExit": { en: "Yes, exit", ms: "Ya, keluar" },
  "profile.notice": {
    en: "Eczema Care Hero is an educational game, not a medical or diagnostic tool. Eczema differs for everyone; always follow a healthcare professional's advice.",
    ms: "Eczema Care Hero ialah permainan pendidikan, bukan alat perubatan atau diagnosis. Ekzema berbeza bagi setiap orang; sentiasa ikut nasihat profesional kesihatan.",
  },
  "staff.title": { en: "Staff Directory", ms: "Direktori Staf" },
  "staff.find": { en: "Find {name}", ms: "Cari {name}" },
  "staff.offDuty": { en: "Off duty", ms: "Tidak bertugas" },
  "id.clinic": { en: "Eczema Care Clinic", ms: "Klinik Eczema Care" },
  "id.staffId": { en: "Staff ID", ms: "Kad Staf" },
  "id.you": { en: "You", ms: "Anda" },
  "id.offToday": { en: "Off duty today", ms: "Cuti hari ini" },
  "id.myRole": { en: "My role", ms: "Tugas saya" },
  "id.canHelp": { en: "Can help you with", ms: "Boleh membantu dengan" },
  "id.about": { en: "About me", ms: "Tentang saya" },
  "id.valid": { en: "Valid until 12/2027", ms: "Sah hingga 12/2027" },
  "dialog.ok": { en: "OK", ms: "OK" },

  // ---------- closing the clinic & day summary ----------
  "close.action": { en: "🌇 Close the clinic", ms: "🌇 Tutup klinik" },
  "close.title": { en: "Close the clinic?", ms: "Tutup klinik?" },
  "close.withPatient": { en: "You're still with a patient.", ms: "Anda masih bersama pesakit." },
  "close.waiting1": { en: "1 patient is waiting.", ms: "1 pesakit sedang menunggu." },
  "close.waitingN": { en: "{n} patients are waiting.", ms: "{n} pesakit sedang menunggu." },
  "close.rebooked": { en: "They'll be rebooked for another day (no points are lost). Close the clinic now?", ms: "Mereka akan dijadualkan semula ke hari lain (tiada markah hilang). Tutup klinik sekarang?" },
  "close.wrapUp": { en: "Wrap up for today and see your results?", ms: "Tamatkan hari ini dan lihat keputusan?" },
  "close.confirm": { en: "🌇  Close for today", ms: "🌇  Tutup untuk hari ini" },
  "summary.title": { en: "Day {day} complete", ms: "Hari {day} selesai" },
  "summary.subtitle": { en: "The clinic is closed. Great work today!", ms: "Klinik telah ditutup. Syabas untuk hari ini!" },
  "summary.care": { en: "Patient care", ms: "Rawatan pesakit" },
  "summary.left": { en: "Left while waiting", ms: "Pergi semasa menunggu" },
  "summary.rebooked": { en: "Rebooked at closing", ms: "Dijadual semula semasa tutup" },
  "summary.careXp": { en: "XP from care", ms: "XP daripada rawatan" },
  "summary.careNote": { en: "Your main score. People who left or were rebooked never take points away.", ms: "Markah utama anda. Pesakit yang pergi atau dijadual semula tidak mengurangkan markah." },
  "summary.helped": { en: "Patients you helped", ms: "Pesakit yang anda bantu" },
  "summary.none": { en: "No patients were seen today. Call the next patient in at the Consultation desk.", ms: "Tiada pesakit dirawat hari ini. Panggil pesakit seterusnya di meja Konsultasi." },
  "summary.taught": { en: "💡 What today's visits taught", ms: "💡 Pelajaran daripada lawatan hari ini" },
  "summary.visitors": { en: "Clinic visitors", ms: "Pelawat klinik" },
  "summary.cameDoctor": { en: "Came to see the doctor", ms: "Datang berjumpa doktor" },
  "summary.helpedTeam": { en: "Helped by Nurul & Grace", ms: "Dibantu oleh Nurul & Grace" },
  "summary.visitorsNote": { en: "Routine visits are handled by the team and don't affect your score.", ms: "Lawatan rutin diuruskan oleh pasukan dan tidak menjejaskan markah anda." },
  "summary.events": { en: "Clinic help (bonus)", ms: "Bantuan klinik (bonus)" },
  "summary.eventsSolved": { en: "Events solved", ms: "Tugasan diselesaikan" },
  "summary.bonusXp": { en: "Bonus XP", ms: "XP bonus" },
  "summary.eventsNote": { en: "Optional. Never affects care points.", ms: "Pilihan. Tidak menjejaskan markah rawatan." },
  "summary.arcade": { en: "Arcade", ms: "Arked" },
  "summary.arcadeNote": { en: "Mini-game coins are kept separate from care.", ms: "Syiling permainan mini diasingkan daripada markah rawatan." },
  "summary.level": { en: "Level {n}", ms: "Tahap {n}" },
  "summary.carePts": { en: "{n} care pts", ms: "{n} mata rawatan" },
  "summary.nextDay": { en: "☀️  Start day {day}", ms: "☀️  Mula hari {day}" },

  // ---------- rooms ----------
  "room.reception": { en: "Reception", ms: "Pendaftaran" },
  "room.waiting": { en: "Waiting Area", ms: "Ruang Menunggu" },
  "room.care": { en: "Care Room", ms: "Bilik Rawatan" },
  "room.storage": { en: "Storage", ms: "Stor" },
  "room.office": { en: "Staff Office", ms: "Pejabat Staf" },
  "room.arcade": { en: "Arcade Room", ms: "Bilik Arked" },
  "room.consult": { en: "Consultation", ms: "Konsultasi" },
  "room.pharmacy": { en: "Pharmacy", ms: "Farmasi" },
  "room.toilet": { en: "Toilet", ms: "Tandas" },
  "room.surau": { en: "Surau", ms: "Surau" },
  "room.lounge": { en: "Staff Lounge", ms: "Bilik Rehat" },
} as const satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

const current: Lang = language() === "ms" ? "ms" : "en";

export function lang(): Lang {
  return current;
}

/** The text for `key` in the current language, with `{name}` placeholders filled in. */
export function t(key: StringKey, vars: Record<string, string | number> = {}): string {
  const s: string = STRINGS[key][current];
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/** Room names in the current language (rooms.ts keeps the English ids). */
export function roomName(id: string, fallback: string): string {
  const key = `room.${id}` as StringKey;
  return key in STRINGS ? t(key) : fallback;
}
