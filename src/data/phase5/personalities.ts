import { L } from "./text";
import { F01, F02, F03, F04, F05 } from "./scenarios";
import type { Reaction, VisitOutcome } from "../../mission/types";

// Phase 5 personalities (brief section 3), attached as data to the eight existing patient ids in
// data/patients.ts. Mapped by behaviour only, never by age, ethnicity, language or religion:
// nobody's joke is about who they are, only about a harmless everyday habit.
//
// Greetings follow three continuity patterns (brief section 6):
//   first  – no recorded visit yet
//   return – recognises the doctor / comes back for a follow-up ({doctor} = the player's doctor)
//   casual – has been before, just another visit
// Each pattern has two wordings, cycled so the same line isn't used on two visits in a row.

export type Archetype =
  | "overResearcher"
  | "storyteller"
  | "hurry"
  | "overprepared"
  | "curious"
  | "calmRegular"
  | "quietFirstTimer"
  | "concerned";

export type GreetingPattern = "first" | "return" | "casual";

export interface Personality {
  patientId: string;
  archetype: Archetype;
  /** 1 calm … 3 very expressive: how big the portrait reactions are. */
  intensity: 1 | 2 | 3;
  /** Their funny scenario (only funny archetypes have one). */
  signature?: string;
  /** Reaction shown with the greeting. */
  greetReaction: Reaction;
  greetings: Record<GreetingPattern, string[]>;
}

function greetings(id: Archetype, g: Record<GreetingPattern, [en: string, ms: string][]>): Record<GreetingPattern, string[]> {
  const out = {} as Record<GreetingPattern, string[]>;
  for (const pattern of ["first", "return", "casual"] as GreetingPattern[]) {
    out[pattern] = g[pattern].map(([en, ms], i) => L(`patient.${id}.greeting.${pattern}.${i + 1}`, en, ms));
  }
  return out;
}

export const PERSONALITIES: Personality[] = [
  {
    patientId: "daniel",
    archetype: "overResearcher",
    intensity: 3,
    signature: F01.id,
    greetReaction: "bounce",
    greetings: greetings("overResearcher", {
      first: [
        ["Hi doctor! I've done some reading before coming in. Quite a lot of reading, actually.", "Hai doktor! Saya dah buat sedikit bacaan sebelum datang. Sebenarnya, banyak juga."],
        ["Hello! Fair warning: I have seventeen browser tabs open about my skin.", "Helo! Amaran awal: saya buka tujuh belas tab pelayar pasal kulit saya."],
      ],
      return: [
        ["{doctor}! Good to see you again. Only five tabs open this time, I promise.", "{doctor}! Gembira jumpa lagi. Kali ni lima tab je, janji."],
        ["Hi {doctor}! I followed your plan… and only checked it online a little.", "Hai {doctor}! Saya ikut pelan doktor… dan cuma semak dalam internet sikit je."],
      ],
      casual: [
        ["Hi again! Quick visit today, no research slides.", "Hai lagi! Lawatan ringkas hari ni, tiada slaid kajian."],
        ["Back again! My search history says hello.", "Datang lagi! Sejarah carian saya kirim salam."],
      ],
    }),
  },
  {
    patientId: "farid",
    archetype: "storyteller",
    intensity: 2,
    signature: F02.id,
    greetReaction: "smile",
    greetings: greetings("storyteller", {
      first: [
        ["Good morning, doctor! What a day already. Let me tell you…", "Selamat pagi, doktor! Pagi ni dah macam-macam jadi. Biar saya cerita…"],
        ["Hello! You won't believe what happened on my way here.", "Helo! Doktor takkan percaya apa jadi masa saya datang ke sini."],
      ],
      return: [
        ["{doctor}! Remember me? The bicycle story? I have a sequel.", "{doctor}! Ingat saya? Cerita basikal tu? Saya ada sambungannya."],
        ["Ah, {doctor}! I've been saving a story just for you.", "Ah, {doctor}! Saya simpan satu cerita khas untuk doktor."],
      ],
      casual: [
        ["Hello again! I'll keep it short today. Probably.", "Helo lagi! Hari ni saya cerita ringkas je. Mungkin."],
        ["Back again! Only one story today, I promise.", "Datang lagi! Satu cerita je hari ni, janji."],
      ],
    }),
  },
  {
    patientId: "suresh",
    archetype: "hurry",
    intensity: 2,
    signature: F03.id,
    greetReaction: "blink",
    greetings: greetings("hurry", {
      first: [
        ["Hi doctor, nice to meet you. Can we be quick? Thank you!", "Hai doktor, selamat berkenalan. Boleh kita cepat sikit? Terima kasih!"],
        ["Hello! I timed my walk from the car park. Forty seconds.", "Helo! Saya kira masa jalan dari tempat letak kereta. Empat puluh saat."],
      ],
      return: [
        ["{doctor}! Great, you know the drill. Fast and careful, like last time.", "{doctor}! Bagus, doktor dah tahu. Cepat tapi teliti, macam kali lepas."],
        ["Hi {doctor}! I've got a little more time today. Two whole minutes.", "Hai {doctor}! Hari ni saya ada masa lebih sikit. Dua minit penuh."],
      ],
      casual: [
        ["Hi again! Quick check, if that's okay.", "Hai lagi! Semakan cepat, kalau boleh."],
        ["Back again! Same speed as usual?", "Datang lagi! Laju macam biasa?"],
      ],
    }),
  },
  {
    patientId: "sarah",
    archetype: "overprepared",
    intensity: 2,
    signature: F04.id,
    greetReaction: "smile",
    greetings: greetings("overprepared", {
      first: [
        ["Good morning, doctor. I've prepared a few notes. And a folder.", "Selamat pagi, doktor. Saya dah sediakan sedikit nota. Dan satu fail."],
        ["Hello! I printed my questions so I won't forget any.", "Helo! Saya cetak soalan saya supaya tak terlupa."],
      ],
      return: [
        ["{doctor}! I updated my notes since last time. Version two.", "{doctor}! Saya kemas kini nota sejak kali lepas. Versi kedua."],
        ["Hi {doctor}! I kept a diary of my skin, just like you suggested.", "Hai {doctor}! Saya simpan diari kulit, macam doktor cadangkan."],
      ],
      casual: [
        ["Hello again! Just the one folder today.", "Helo lagi! Satu fail je hari ni."],
        ["Back again! I've colour-coded my questions.", "Datang lagi! Soalan saya dah berkod warna."],
      ],
    }),
  },
  {
    patientId: "siti",
    archetype: "curious",
    intensity: 3,
    signature: F05.id,
    greetReaction: "bounce",
    greetings: greetings("curious", {
      first: [
        ["Hi doctor! Is this where you look at skin? That's so cool.", "Hai doktor! Sini ke tempat doktor periksa kulit? Best nya."],
        ["Hello! What's that machine for? Sorry, hi!", "Helo! Mesin tu untuk apa? Maaf, hai!"],
      ],
      return: [
        ["{doctor}! I told my class everything you explained last time.", "{doctor}! Saya cerita kat kelas semua yang doktor terangkan kali lepas."],
        ["Hi {doctor}! I have new questions. Better ones.", "Hai {doctor}! Saya ada soalan baru. Lebih bagus."],
      ],
      casual: [
        ["Hi again! Can I still ask questions?", "Hai lagi! Saya masih boleh tanya soalan?"],
        ["Back again! I wrote my questions on my hand. Just kidding.", "Datang lagi! Saya tulis soalan kat tangan. Gurau je."],
      ],
    }),
  },
  {
    patientId: "wong",
    archetype: "calmRegular",
    intensity: 1,
    greetReaction: "smile",
    greetings: greetings("calmRegular", {
      first: [
        ["Good morning, doctor. Thank you for seeing me.", "Selamat pagi, doktor. Terima kasih kerana berjumpa saya."],
        ["Hello, doctor. Just a routine check, I think.", "Helo, doktor. Pemeriksaan biasa, rasanya."],
      ],
      return: [
        ["Good morning, {doctor}. Nice to see you again.", "Selamat pagi, {doctor}. Gembira jumpa lagi."],
        ["Ah, {doctor}. I've been keeping to the routine.", "Ah, {doctor}. Saya ikut rutin yang diberi."],
      ],
      casual: [
        ["Hello again, doctor. Same as usual.", "Helo lagi, doktor. Macam biasa."],
        ["Good to be back. Nothing dramatic today.", "Datang lagi. Tiada yang dramatik hari ni."],
      ],
    }),
  },
  {
    patientId: "amina",
    archetype: "quietFirstTimer",
    intensity: 1,
    greetReaction: "shy",
    greetings: greetings("quietFirstTimer", {
      first: [
        ["Hi… it's my first time at a clinic like this.", "Hai… ini kali pertama saya ke klinik macam ni."],
        ["Hello, doctor. I'm a bit nervous, sorry.", "Helo, doktor. Saya agak gementar, maaf."],
      ],
      return: [
        ["Hi {doctor}. I feel less nervous this time.", "Hai {doctor}. Kali ni saya kurang gementar."],
        ["Hello {doctor}. Thank you for last time.", "Helo {doctor}. Terima kasih untuk kali lepas."],
      ],
      casual: [
        ["Hi again, doctor.", "Hai lagi, doktor."],
        ["Hello. I'm back.", "Helo. Saya datang lagi."],
      ],
    }),
  },
  {
    patientId: "rohana",
    archetype: "concerned",
    intensity: 1,
    greetReaction: "tilt",
    greetings: greetings("concerned", {
      first: [
        ["Doctor, thank you for seeing me. I've been a bit worried.", "Doktor, terima kasih kerana berjumpa saya. Saya agak risau."],
        ["Hello, doctor. I hope I'm not wasting your time.", "Helo, doktor. Harap saya tak membazir masa doktor."],
      ],
      return: [
        ["{doctor}, thank you for last time. It helped me worry less.", "{doctor}, terima kasih untuk kali lepas. Saya kurang risau."],
        ["Hello {doctor}. I came back like you said.", "Helo {doctor}. Saya datang semula macam doktor pesan."],
      ],
      casual: [
        ["Hello again, doctor. Just want to be sure.", "Helo lagi, doktor. Cuma nak pastikan."],
        ["Back again, doctor. Better safe than sorry.", "Datang lagi, doktor. Lebih baik berjaga-jaga."],
      ],
    }),
  },
];

export function personalityOf(patientId: string): Personality | undefined {
  return PERSONALITIES.find((p) => p.patientId === patientId);
}

// ---------- labels for the new UI ----------

/** Short, emoji-free caption for a reaction (screen readers and reduced motion). */
export const REACTION_LABEL: Record<Reaction, string> = {
  smile: L("reaction.smile", "smiles", "tersenyum"),
  blink: L("reaction.blink", "blinks", "berkelip"),
  surprised: L("reaction.surprised", "looks surprised", "nampak terkejut"),
  shy: L("reaction.shy", "pauses shyly", "terdiam malu"),
  tilt: L("reaction.tilt", "tilts their head", "memiringkan kepala"),
  thinking: L("reaction.thinking", "thinks for a moment", "berfikir sejenak"),
  bounce: L("reaction.bounce", "perks up", "jadi bersemangat"),
};

export const OUTCOME_LABEL: Record<VisitOutcome, string> = {
  advice: L("outcome.advice", "Advice only", "Nasihat sahaja"),
  followup: L("outcome.followup", "Follow-up", "Susulan"),
  care: L("outcome.care", "Care in the Care Room", "Rawatan di Bilik Rawatan"),
  referral: L("outcome.referral", "Doctor review / referral", "Penilaian doktor / rujukan"),
};

export const UI = {
  outcome: L("ui.outcome", "Visit outcome", "Hasil lawatan"),
  notes: L("ui.notes", "📝 Case notes", "📝 Nota kes"),
  notesEmpty: L("ui.notesEmpty", "Pick kind, helpful answers to learn about {name}", "Pilih jawapan yang baik dan membantu untuk mengenali {name}"),
  turn: L("ui.turn", "Reply {n} of {total}", "Jawapan {n} daripada {total}"),
  next: L("ui.next", "Next", "Seterusnya"),
  takeLook: L("ui.takeLook", "🩺  {doctor}, please take a look", "🩺  {doctor}, sila periksa"),
  serious: L("ui.serious", "Warning signs: stay calm, clear and kind.", "Tanda amaran: kekal tenang, jelas dan baik."),
};
