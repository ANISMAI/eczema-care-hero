import { doctorSteps } from "../cases/steps";
import { L } from "./text";
import type { CaseTemplate, DialogueChoice, DialogueTurn, Reaction } from "../../mission/types";

// Phase 5 visit scenarios (brief section 4): five funny and three calm/serious consultation
// templates. Each one is a normal doctor visit (call → chat → Dr. Lim → [Care Room] → Grace →
// home) with a short branching chat of 2–3 turns and 2–3 choices.
//
// Content rules (Phase 2 brief section 10 and Phase 5 section 1): the humour comes from everyday
// quirks and misunderstandings, never from eczema, symptoms, age, disability, ethnicity,
// language or religion. No diagnosis by the player, no doses or prescription medicines, no
// "cure", the doctor decides the plan, and the serious scenario gets calm, safe answers only.
// `{name}` is filled in with the visiting patient's name.

const DR_LIM = "assets/portraits/dr-lim.webp";

type Pair = [en: string, ms: string];

/** A text builder for one scenario: s("turn.onset.line", en, ms) → key "scenario.<id>.turn.onset.line". */
function texts(id: string) {
  return (path: string, [en, ms]: Pair) => L(`scenario.${id}.${path}`, en, ms);
}

interface ChoiceSpec {
  id: string;
  good: boolean;
  text: Pair;
  reply: Pair;
  reaction?: Reaction;
  feedback?: Pair;
  note?: Pair;
}

function turn(s: ReturnType<typeof texts>, id: string, line: Pair | null, choices: ChoiceSpec[], reaction?: Reaction): DialogueTurn {
  const at = `turn.${id}`;
  return {
    id,
    line: line ? s(`${at}.line`, line) : undefined,
    reaction,
    choices: choices.map(
      (c): DialogueChoice => ({
        id: c.id,
        good: c.good,
        text: s(`${at}.choice.${c.id}.text`, c.text),
        reply: s(`${at}.choice.${c.id}.reply`, c.reply),
        reaction: c.reaction,
        feedback: c.feedback && s(`${at}.choice.${c.id}.feedback`, c.feedback),
        note: c.note && s(`${at}.choice.${c.id}.note`, c.note),
      })
    ),
  };
}

const SAFETY: Pair = [
  "Come back if the skin oozes, spreads quickly, becomes painful, or if there's a fever.",
  "Datang semula jika kulit berair, cepat merebak, menjadi sakit, atau jika demam.",
];

// ---------- F01 · The Over-Researcher ----------

const f01 = texts("f01");
export const F01: CaseTemplate = {
  id: "f01-over-researcher",
  mood: "funny",
  outcome: "advice",
  planKey: "f01",
  title: f01("title", ["Consultation · Read it online", "Konsultasi · Baca di internet"]),
  reason: f01("reason", ["Itchy patches, lots of web searches", "Tompok gatal, banyak carian internet"]),
  intake: {
    reason: f01("intake.reason", ["Dry, itchy patches on the arms, plus a long list of web searches", "Tompok kering dan gatal di lengan, serta senarai panjang carian internet"]),
    objective: f01("intake.objective", ["Listen kindly, sort facts from search results, and check the skin with Dr. Lim.", "Dengar dengan baik, asingkan fakta daripada hasil carian, dan periksa kulit bersama Dr. Lim."]),
  },
  steps: doctorSteps(false),
  interview: {
    intro: f01("intro.a", [
      "I searched my symptoms. The internet says it's eczema, a rare tropical rash… or that I'm part lizard.",
      "Saya cari simptom dalam internet. Katanya ekzema, ruam tropika yang jarang… atau saya separuh cicak.",
    ]),
    introVariants: [
      f01("intro.b", [
        "One website said itchy elbows mean I'm allergic to Mondays. Is that a real thing?",
        "Satu laman web kata siku gatal maksudnya saya alah pada hari Isnin. Betul ke?",
      ]),
    ],
    prompts: [],
    turns: [
      turn(f01, "search", null, [
        {
          id: "explore",
          good: true,
          text: ["Thanks for reading up! Let's look at what your skin is doing. What have you noticed?", "Terima kasih sebab rajin membaca! Jom tengok apa yang berlaku pada kulit awak. Apa yang awak perasan?"],
          reply: ["Dry, itchy patches on the inside of my elbows. Worse at night.", "Tompok kering dan gatal di bahagian dalam siku. Lebih teruk waktu malam."],
          reaction: "smile",
          note: ["Dry, itchy patches, inner elbows, worse at night", "Tompok kering dan gatal, dalam siku, lebih teruk waktu malam"],
        },
        {
          id: "dismiss",
          good: false,
          text: ["Stop reading the internet. It's all rubbish.", "Berhenti baca internet. Semuanya merepek."],
          reply: ["Oh… okay. I just wanted to understand it.", "Oh… baiklah. Saya cuma nak faham."],
          reaction: "shy",
          feedback: ["Brushing off their reading can feel dismissive. Thank them, then gently focus on what the skin is doing.", "Menolak bacaan mereka boleh rasa tidak dihargai. Ucap terima kasih, kemudian fokus dengan lembut pada keadaan kulit."],
        },
        {
          id: "agree",
          good: false,
          text: ["Yes, it could be that rare rash.", "Ya, mungkin juga ruam jarang tu."],
          reply: ["WHAT?! I knew it!", "APA?! Dah agak dah!"],
          reaction: "surprised",
          feedback: ["Don't agree with a guess before anyone has checked the skin. Ask about the symptoms first.", "Jangan setuju dengan tekaan sebelum kulit diperiksa. Tanya tentang simptom dahulu."],
        },
      ]),
      turn(f01, "remedy", ["So… should I try the turmeric-and-lime paste from that video?", "Jadi… patut ke saya cuba pes kunyit dan limau dari video tu?"], [
        {
          id: "check",
          good: true,
          text: ["Home pastes can sting and irritate sensitive skin. Let's ask Dr. Lim what's safe for you.", "Pes buatan sendiri boleh pedih dan merengsakan kulit sensitif. Jom tanya Dr. Lim apa yang selamat untuk awak."],
          reply: ["Fair. My skin is annoyed enough already.", "Betul juga. Kulit saya dah cukup 'merajuk'."],
          reaction: "thinking",
          note: ["Thinking of trying home remedies from videos: advised to check first", "Bercadang cuba ubat rumah dari video: dinasihatkan semak dahulu"],
        },
        {
          id: "natural",
          good: false,
          text: ["Sure, natural things are always safe.", "Boleh, bahan semula jadi memang selalu selamat."],
          reply: ["Great, I'll buy ten limes!", "Bagus, saya beli sepuluh biji limau!"],
          reaction: "bounce",
          feedback: ["\"Natural\" doesn't always mean gentle. Lime and spices can irritate eczema skin.", "\"Semula jadi\" tak semestinya lembut. Limau dan rempah boleh merengsakan kulit ekzema."],
        },
      ]),
      turn(f01, "catching", ["Last question: is eczema contagious? A forum said it is.", "Soalan terakhir: ekzema berjangkit ke? Satu forum kata ya."], [
        {
          id: "no",
          good: true,
          text: ["No, eczema isn't contagious. You can't catch it or pass it on.", "Tidak, ekzema tidak berjangkit. Awak tak boleh dijangkiti atau menjangkitkannya."],
          reply: ["Phew! My housemate will be relieved.", "Fuh! Lega rakan serumah saya nanti."],
          reaction: "smile",
          note: ["Worried eczema is catching: reassured it isn't", "Risau ekzema berjangkit: diyakinkan ia tidak berjangkit"],
        },
        {
          id: "distance",
          good: false,
          text: ["Better keep away from people, just to be safe.", "Lebih baik jauhkan diri daripada orang, untuk selamat."],
          reply: ["…No hugs for a while, then?", "…Tak boleh peluk sesiapa la lepas ni?"],
          reaction: "shy",
          feedback: ["Eczema isn't catching. Saying otherwise can make people feel ashamed or alone.", "Ekzema tidak berjangkit. Berkata sebaliknya boleh buat orang rasa malu atau tersisih."],
        },
      ]),
    ],
    outro: f01("outro", ["Okay, I'm ready. Dr. Lim, please be gentler than the internet.", "Okey, saya dah sedia. Dr. Lim, tolong lebih lembut daripada internet ya."]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: f01("consult.intro", ["Let's compare {name}'s skin with healthy skin. Tap what looks different.", "Jom bandingkan kulit {name} dengan kulit sihat. Ketik apa yang nampak berbeza."]),
    spots: [
      { id: "dry", label: f01("spot.dry.label", ["Dry", "Kering"]), x: 50, y: 30, info: f01("spot.dry.info", ["Fine, flaky skin that loses water easily, so it itches.", "Kulit halus bersisik yang mudah hilang air, jadi ia gatal."]) },
      { id: "red", label: f01("spot.red.label", ["Mild redness", "Kemerahan ringan"]), x: 42, y: 58, info: f01("spot.red.info", ["A slight pink patch from scratching. No swelling or oozing.", "Tompok merah jambu ringan akibat garu. Tiada bengkak atau berair."]) },
    ],
    summary: f01("consult.summary", ["Dry, irritated skin and no warning signs today. Good news: no lizard. My advice for {name}:", "Kulit kering dan merengsa, tiada tanda amaran hari ini. Berita baik: bukan cicak. Nasihat saya untuk {name}:"]),
    plan: [
      f01("plan.1", ["Moisturise twice a day with a fragrance-free cream.", "Sapu pelembap tanpa pewangi dua kali sehari."]),
      f01("plan.2", ["Check new products or home remedies with the clinic before trying them.", "Semak produk baru atau ubat rumah dengan klinik sebelum mencubanya."]),
      f01("plan.3", ["Grace will have a fragrance-free cream ready at the Pharmacy.", "Grace akan sediakan krim tanpa pewangi di Farmasi."]),
    ],
    safety: f01("consult.safety", SAFETY),
  },
  collected: f01("collected", ["💊  {name} picked up a fragrance-free cream from Grace ✓", "💊  {name} ambil krim tanpa pewangi daripada Grace ✓"]),
  thanks: f01("thanks", ["Thanks, doctor! I'll close a few tabs tonight 😄", "Terima kasih, doktor! Malam ni saya tutup beberapa tab 😄"]),
  takeaway: f01("takeaway", [
    "Online searches can worry people. Listen kindly, focus on what the skin is actually doing, and let a clinician sort fact from fiction.",
    "Carian internet boleh merisaukan. Dengar dengan baik, fokus pada keadaan sebenar kulit, dan biar klinisian asingkan fakta daripada cerita.",
  ]),
};

// ---------- F02 · The Storyteller ----------

const f02 = texts("f02");
export const F02: CaseTemplate = {
  id: "f02-storyteller",
  mood: "funny",
  outcome: "advice",
  planKey: "f02",
  title: f02("title", ["Consultation · A long story", "Konsultasi · Cerita panjang"]),
  reason: f02("reason", ["Itchy hands (and a story)", "Tangan gatal (dan sebuah cerita)"]),
  intake: {
    reason: f02("intake.reason", ["Itchy, dry hands. Likes to chat.", "Tangan kering dan gatal. Suka berbual."]),
    objective: f02("intake.objective", ["Enjoy the story, then politely steer back to when it started and what makes it worse.", "Nikmati ceritanya, kemudian dengan sopan kembali kepada bila ia bermula dan apa yang memburukkannya."]),
  },
  steps: doctorSteps(false),
  interview: {
    intro: f02("intro.a", ["Doctor, it all began back when I bought my first bicycle…", "Doktor, ceritanya bermula masa saya beli basikal pertama dulu…"]),
    introVariants: [
      f02("intro.b", ["Doctor, to understand my itch, you first need to know about my neighbour's goat…", "Doktor, untuk faham gatal saya, doktor kena tahu dulu pasal kambing jiran saya…"]),
    ],
    prompts: [],
    turns: [
      turn(f02, "onset", null, [
        {
          id: "redirect",
          good: true,
          text: ["That sounds interesting. Can I check when the itching actually started?", "Menarik ceritanya. Boleh saya tahu bila rasa gatal itu sebenarnya bermula?"],
          reply: ["Oh! Last week. I got carried away!", "Oh! Minggu lepas. Terleka pula saya bercerita!"],
          reaction: "surprised",
          note: ["Itchy hands since last week", "Tangan gatal sejak minggu lepas"],
        },
        {
          id: "abrupt",
          good: false,
          text: ["Please just get to the point.", "Tolong terus ke intinya."],
          reply: ["Ah… sorry, doctor.", "Ah… maaf, doktor."],
          reaction: "shy",
          feedback: ["A bit abrupt. A friendly redirect keeps them comfortable and still gets the answer.", "Agak kasar. Mengubah arah dengan mesra buat pesakit selesa dan jawapan tetap diperoleh."],
        },
        {
          id: "more",
          good: false,
          text: ["Wow, tell me more about the bicycle!", "Wah, ceritalah lagi pasal basikal tu!"],
          reply: ["Well, it was red, with a bell that went ding-ding…", "Hmm, warnanya merah, ada loceng bunyi ting-ting…"],
          reaction: "bounce",
          feedback: ["Lovely to listen, but others are waiting. Gently bring the chat back to the skin.", "Seronok mendengar, tapi pesakit lain sedang menunggu. Bawa perbualan kembali kepada kulit dengan lembut."],
        },
      ]),
      turn(f02, "trigger", ["Now, where was I… the itch is on my hands. Did I mention I fix bicycles now?", "Tadi sampai mana… gatalnya di tangan. Saya ada cakap ke saya baiki basikal sekarang?"], [
        {
          id: "work",
          good: true,
          text: ["You did! Does anything at work make it worse?", "Ada! Ada apa-apa di tempat kerja yang memburukkannya?"],
          reply: ["Now that you ask… the grease cleaner! My hands sting after I use it.", "Bila doktor tanya… pencuci gris! Tangan saya pedih lepas guna."],
          reaction: "thinking",
          note: ["Worse after using a strong grease cleaner at work", "Lebih teruk selepas guna pencuci gris yang kuat di tempat kerja"],
        },
        {
          id: "skip",
          good: false,
          text: ["Let's skip your job.", "Kita langkau pasal kerja awak."],
          reply: ["But my job is the interesting part!", "Tapi kerja saya bahagian paling menarik!"],
          reaction: "tilt",
          feedback: ["Their work may hold the clue. Ask how it affects the skin.", "Kerja mereka mungkin petunjuknya. Tanya bagaimana ia menjejaskan kulit."],
        },
      ]),
      turn(f02, "advice", ["So is it the cleaner? Or is my bicycle jealous?", "Jadi pencuci tu ke puncanya? Atau basikal saya cemburu?"], [
        {
          id: "gloves",
          good: true,
          text: ["Strong cleaners can irritate skin. Dr. Lim will take a look, and gloves may help.", "Pencuci yang kuat boleh merengsakan kulit. Dr. Lim akan periksa, dan sarung tangan mungkin membantu."],
          reply: ["Gloves! Why didn't the bicycle tell me?", "Sarung tangan! Kenapa basikal tak bagitahu saya?"],
          reaction: "smile",
          note: ["Open to wearing gloves at work", "Sudi memakai sarung tangan semasa bekerja"],
        },
        {
          id: "quit",
          good: false,
          text: ["Definitely the cleaner. Stop working.", "Memang pencuci tu. Berhenti kerja."],
          reply: ["Stop working?! Who will fix the bicycles?", "Berhenti kerja?! Siapa nak baiki basikal?"],
          reaction: "surprised",
          feedback: ["Don't jump to conclusions or big life changes. Let the doctor assess and suggest simple steps.", "Jangan cepat membuat kesimpulan atau perubahan besar. Biar doktor menilai dan cadangkan langkah mudah."],
        },
      ]),
    ],
    outro: f02("outro", ["Alright, Dr. Lim, have a look. I'll save the goat story for next time.", "Baiklah, Dr. Lim, sila periksa. Cerita kambing saya simpan untuk lain kali."]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: f02("consult.intro", ["Let's compare {name}'s hand with healthy skin. Tap what looks different.", "Jom bandingkan tangan {name} dengan kulit sihat. Ketik apa yang nampak berbeza."]),
    spots: [
      { id: "dry", label: f02("spot.dry.label", ["Dry", "Kering"]), x: 50, y: 30, info: f02("spot.dry.info", ["Flaky, dry skin across the back of the hand.", "Kulit kering bersisik di belakang tangan."]) },
      { id: "rough", label: f02("spot.rough.label", ["Rough", "Kasar"]), x: 58, y: 82, info: f02("spot.rough.info", ["A rough area where the cleaner and rubbing have irritated the skin.", "Kawasan kasar yang direngsakan oleh pencuci dan geselan."]) },
    ],
    summary: f02("consult.summary", ["Dry, irritated hands, probably made worse by the strong cleaner. No warning signs. My advice for {name}:", "Tangan kering dan merengsa, mungkin diburukkan oleh pencuci yang kuat. Tiada tanda amaran. Nasihat saya untuk {name}:"]),
    plan: [
      f02("plan.1", ["Wear gloves with strong cleaners, then wash with a gentle cleanser.", "Pakai sarung tangan semasa guna pencuci kuat, kemudian basuh dengan pencuci lembut."]),
      f02("plan.2", ["Moisturise after washing and before bed.", "Sapu pelembap selepas membasuh dan sebelum tidur."]),
      f02("plan.3", ["Grace will have a fragrance-free hand cream ready.", "Grace akan sediakan krim tangan tanpa pewangi."]),
    ],
    safety: f02("consult.safety", SAFETY),
  },
  collected: f02("collected", ["💊  {name} picked up a hand cream from Grace ✓", "💊  {name} ambil krim tangan daripada Grace ✓"]),
  thanks: f02("thanks", ["Thank you, doctor! That's the shortest story I've ever told 😄", "Terima kasih, doktor! Itu cerita paling pendek pernah saya cerita 😄"]),
  takeaway: f02("takeaway", [
    "Some patients love to chat. A warm, polite redirect gets the important details without making them feel rushed.",
    "Ada pesakit yang suka berbual. Mengubah arah dengan mesra dan sopan dapat maklumat penting tanpa buat mereka rasa tergesa-gesa.",
  ]),
};

// ---------- F03 · Always in a Hurry ----------

const f03 = texts("f03");
export const F03: CaseTemplate = {
  id: "f03-in-a-hurry",
  mood: "funny",
  outcome: "advice",
  planKey: "f03",
  title: f03("title", ["Consultation · In a hurry", "Konsultasi · Tergesa-gesa"]),
  reason: f03("reason", ["Itchy wrists, short on time", "Pergelangan gatal, kesuntukan masa"]),
  intake: {
    reason: f03("intake.reason", ["Itchy, dry wrists. Keeps checking the time.", "Pergelangan tangan kering dan gatal. Asyik melihat jam."]),
    objective: f03("intake.objective", ["Keep it brief, but still ask the essentials and check for warning signs.", "Ringkaskan, tapi tetap tanya perkara penting dan semak tanda amaran."]),
  },
  steps: doctorSteps(false),
  interview: {
    intro: f03("intro.a", ["Hi doctor, quick one please! My parking runs out in nine minutes.", "Hai doktor, cepat sikit ya! Parking saya tamat dalam sembilan minit."]),
    introVariants: [
      f03("intro.b", ["Doctor, I'm between two meetings. Can we do this at double speed?", "Doktor, saya di antara dua mesyuarat. Boleh kita buat dua kali ganda laju?"]),
    ],
    prompts: [],
    turns: [
      turn(f03, "essentials", null, [
        {
          id: "brief",
          good: true,
          text: ["Let's keep it short. What's bothering you, and since when?", "Kita ringkaskan. Apa yang mengganggu, dan sejak bila?"],
          reply: ["Itchy, dry patches on my wrists. About three weeks.", "Tompok kering dan gatal di pergelangan tangan. Lebih kurang tiga minggu."],
          reaction: "smile",
          note: ["Itchy, dry wrists for about 3 weeks", "Pergelangan tangan kering dan gatal kira-kira 3 minggu"],
        },
        {
          id: "skip",
          good: false,
          text: ["No problem, let's skip the questions and just get you a cream.", "Tak apa, kita langkau soalan dan terus bagi krim."],
          reply: ["Perfect! …Wait, is that allowed?", "Bagus! …Eh, boleh ke macam tu?"],
          reaction: "tilt",
          feedback: ["Skipping the history isn't safe. Keep it brief, but still ask the essentials.", "Melangkau sejarah pesakit tidak selamat. Ringkaskan, tapi tetap tanya perkara penting."],
        },
        {
          id: "long",
          good: false,
          text: ["Let's start with your full medical history since childhood.", "Mari mula dengan sejarah perubatan penuh awak sejak kecil."],
          reply: ["Doctor… my parking!", "Doktor… parking saya!"],
          reaction: "surprised",
          feedback: ["Thorough, but too long for today. Focus on the key questions first.", "Teliti, tapi terlalu panjang untuk hari ini. Fokus pada soalan utama dahulu."],
        },
      ]),
      turn(f03, "redflags", ["Anything else? I'm watching the clock…", "Ada lagi? Saya tengah tengok jam ni…"], [
        {
          id: "warning",
          good: true,
          text: ["One important one: any oozing, fever or fast spreading?", "Satu soalan penting: ada berair, demam atau cepat merebak?"],
          reply: ["No, none of that. It's just itchy.", "Tak, tiada semua tu. Gatal je."],
          reaction: "blink",
          note: ["No oozing, fever or spreading", "Tiada berair, demam atau merebak"],
        },
        {
          id: "go",
          good: false,
          text: ["That's all, off you go!", "Itu saja, awak boleh pergi!"],
          reply: ["Great, bye! …Wait, aren't you checking my skin?", "Bagus, bye! …Eh, doktor tak periksa kulit saya ke?"],
          reaction: "surprised",
          feedback: ["Even in a hurry, check for warning signs and let the doctor look at the skin.", "Walaupun tergesa-gesa, semak tanda amaran dan biar doktor periksa kulit."],
        },
      ]),
    ],
    outro: f03("outro", ["Thanks for being quick! Dr. Lim, sixty-second skin check?", "Terima kasih sebab cepat! Dr. Lim, semakan kulit enam puluh saat?"]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: f03("consult.intro", ["A quick but careful look. Tap what looks different on {name}'s skin.", "Semakan cepat tapi teliti. Ketik apa yang nampak berbeza pada kulit {name}."]),
    spots: [
      { id: "dry", label: f03("spot.dry.label", ["Dry", "Kering"]), x: 50, y: 30, info: f03("spot.dry.info", ["Dry, flaky skin where the watch strap sits.", "Kulit kering bersisik di tempat tali jam."]) },
      { id: "red", label: f03("spot.red.label", ["Mild redness", "Kemerahan ringan"]), x: 42, y: 58, info: f03("spot.red.info", ["A little pink from rubbing and sweat. No swelling.", "Sedikit merah akibat geselan dan peluh. Tiada bengkak."]) },
    ],
    summary: f03("consult.summary", ["Dry, mildly irritated skin and no warning signs. Short and simple advice for {name}:", "Kulit kering dan sedikit merengsa, tiada tanda amaran. Nasihat ringkas untuk {name}:"]),
    plan: [
      f03("plan.1", ["Moisturise your wrists twice a day. Keep a small tube in your bag.", "Sapu pelembap pada pergelangan dua kali sehari. Simpan tiub kecil dalam beg."]),
      f03("plan.2", ["Loosen tight watch straps and dry the area after sweating.", "Longgarkan tali jam yang ketat dan keringkan kawasan itu selepas berpeluh."]),
      f03("plan.3", ["Grace has a fragrance-free cream ready. It's a quick pick-up!", "Grace dah sediakan krim tanpa pewangi. Ambil cepat je!"]),
    ],
    safety: f03("consult.safety", SAFETY),
  },
  collected: f03("collected", ["💊  {name} grabbed a cream from Grace on the way out ✓", "💊  {name} sempat ambil krim daripada Grace sebelum keluar ✓"]),
  thanks: f03("thanks", ["Thank you! Fastest clinic visit ever. Parking saved 🏃", "Terima kasih! Lawatan klinik paling pantas. Parking selamat 🏃"]),
  takeaway: f03("takeaway", [
    "Busy patients still need safe care: keep it brief, but always ask the essentials and check for warning signs.",
    "Pesakit yang sibuk tetap perlukan rawatan selamat: ringkaskan, tapi sentiasa tanya perkara penting dan semak tanda amaran.",
  ]),
};

// ---------- F04 · The Overprepared One ----------

const f04 = texts("f04");
export const F04: CaseTemplate = {
  id: "f04-overprepared",
  mood: "funny",
  outcome: "advice",
  planKey: "f04",
  title: f04("title", ["Consultation · Product notes", "Konsultasi · Nota produk"]),
  reason: f04("reason", ["Itchy arms, brought every product", "Lengan gatal, bawa semua produk"]),
  intake: {
    reason: f04("intake.reason", ["Itchy arms. Has brought notes on every product used this year.", "Lengan gatal. Bawa nota tentang setiap produk yang digunakan tahun ini."]),
    objective: f04("intake.objective", ["Find the relevant product in the notes, and note possible irritants without diagnosing from a label.", "Cari produk yang berkaitan dalam nota, dan catat kemungkinan perengsa tanpa mendiagnosis daripada label."]),
  },
  steps: doctorSteps(false),
  interview: {
    intro: f04("intro.a", ["Doctor, I brought every product I've used this year. In alphabetical order.", "Doktor, saya bawa semua produk yang saya guna tahun ni. Ikut susunan abjad."]),
    introVariants: [
      f04("intro.b", ["I made a spreadsheet of my creams. Colour-coded. With a pie chart.", "Saya buat hamparan untuk krim-krim saya. Berkod warna. Siap dengan carta pai."]),
    ],
    prompts: [],
    turns: [
      turn(f04, "notes", null, [
        {
          id: "new",
          good: true,
          text: ["That's really helpful! Which product did you start just before the itching began?", "Itu sangat membantu! Produk mana yang awak mula guna sebelum gatal bermula?"],
          reply: ["This new rose-scented body lotion. I started it two weeks ago.", "Losyen badan berbau mawar yang baru ni. Mula guna dua minggu lepas."],
          reaction: "thinking",
          note: ["Itch began after starting a scented lotion 2 weeks ago", "Gatal bermula selepas guna losyen berwangi 2 minggu lepas"],
        },
        {
          id: "away",
          good: false,
          text: ["That's too much. Please put them away.", "Banyak sangat tu. Simpan semua tu."],
          reply: ["Oh… I just wanted to help.", "Oh… saya cuma nak membantu."],
          reaction: "shy",
          feedback: ["Their notes may hold the clue. Thank them and ask which product is new.", "Nota mereka mungkin ada petunjuk. Ucap terima kasih dan tanya produk mana yang baru."],
        },
      ]),
      turn(f04, "label", ["So the lotion is the villain? Should I throw everything out?", "Jadi losyen tu penjahatnya? Patut ke saya buang semuanya?"], [
        {
          id: "careful",
          good: true,
          text: ["The label lists fragrance, which can irritate some people. A label alone can't tell us for sure, so Dr. Lim will check your skin.", "Label menyenaraikan pewangi, yang boleh merengsakan sesetengah orang. Label sahaja tak boleh pastikan, jadi Dr. Lim akan periksa kulit awak."],
          reply: ["Sensible. I'll move the lotion to my 'suspects' list.", "Masuk akal. Saya pindahkan losyen ni ke senarai 'suspek'."],
          reaction: "smile",
          note: ["Scented lotion is a possible irritant; a label alone isn't a diagnosis", "Losyen berwangi mungkin perengsa; label sahaja bukan diagnosis"],
        },
        {
          id: "sure",
          good: false,
          text: ["Yes, that lotion definitely caused it.", "Ya, memang losyen tu puncanya."],
          reply: ["Case closed! …Is it, though?", "Kes selesai! …Betul ke?"],
          reaction: "tilt",
          feedback: ["A label can point to possible irritants, but it can't diagnose. Let the doctor assess the skin.", "Label boleh tunjuk kemungkinan perengsa, tapi tidak boleh mendiagnosis. Biar doktor menilai kulit."],
        },
        {
          id: "bin",
          good: false,
          text: ["Throw them all away.", "Buang semuanya."],
          reply: ["All of them?! Even my sunscreen?", "Semua sekali?! Pelindung matahari saya pun?"],
          reaction: "surprised",
          feedback: ["No need to bin everything. Pausing the new product and keeping gentle basics is enough for now.", "Tak perlu buang semua. Berhenti guna produk baru dan kekalkan produk asas yang lembut sudah memadai buat masa ini."],
        },
      ]),
    ],
    outro: f04("outro", ["Ready for Dr. Lim. I've even labelled my hands. Kidding!", "Sedia untuk Dr. Lim. Saya dah labelkan tangan saya. Gurau je!"]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: f04("consult.intro", ["Thanks for the notes, they help! Let's look at {name}'s skin. Tap what looks different.", "Terima kasih atas nota, sangat membantu! Jom periksa kulit {name}. Ketik apa yang nampak berbeza."]),
    spots: [
      { id: "red", label: f04("spot.red.label", ["Mild redness", "Kemerahan ringan"]), x: 42, y: 58, info: f04("spot.red.info", ["Pink, irritated skin where the lotion was used.", "Kulit merah jambu dan merengsa di tempat losyen digunakan."]) },
      { id: "dry", label: f04("spot.dry.label", ["Dry", "Kering"]), x: 50, y: 30, info: f04("spot.dry.info", ["Some dryness around it. Irritated skin dries out easily.", "Sedikit kering di sekelilingnya. Kulit yang merengsa mudah kering."]) },
    ],
    summary: f04("consult.summary", ["Mild irritation that may be linked to the new scented lotion, and no warning signs. My advice for {name}:", "Kerengsaan ringan yang mungkin berkaitan dengan losyen berwangi baru, dan tiada tanda amaran. Nasihat saya untuk {name}:"]),
    plan: [
      f04("plan.1", ["Pause the scented lotion and see if the skin settles.", "Berhenti guna losyen berwangi dan lihat jika kulit pulih."]),
      f04("plan.2", ["Stick to one gentle, fragrance-free moisturiser for now.", "Guna satu pelembap lembut tanpa pewangi buat masa ini."]),
      f04("plan.3", ["Bring your product list next time too. It really helped!", "Bawa senarai produk lagi lain kali. Ia sangat membantu!"]),
    ],
    safety: f04("consult.safety", SAFETY),
  },
  collected: f04("collected", ["💊  {name} picked up a fragrance-free moisturiser from Grace ✓", "💊  {name} ambil pelembap tanpa pewangi daripada Grace ✓"]),
  thanks: f04("thanks", ["Thank you, doctor! I'm adding 'gentle' to my spreadsheet 📊", "Terima kasih, doktor! Saya tambah 'lembut' dalam hamparan saya 📊"]),
  takeaway: f04("takeaway", [
    "Labels can point to possible irritants like fragrance, but a clinician confirms what's going on. Pausing a new product is often a simple first step.",
    "Label boleh tunjuk kemungkinan perengsa seperti pewangi, tapi klinisian yang mengesahkan. Berhenti guna produk baru selalunya langkah pertama yang mudah.",
  ]),
};

// ---------- F05 · The Curious One ----------

const f05 = texts("f05");
export const F05: CaseTemplate = {
  id: "f05-curious",
  mood: "funny",
  outcome: "advice",
  planKey: "f05",
  title: f05("title", ["Consultation · So many questions", "Konsultasi · Banyak soalan"]),
  reason: f05("reason", ["Itchy knees, lots of questions", "Lutut gatal, banyak soalan"]),
  intake: {
    reason: f05("intake.reason", ["Dry, itchy skin behind the knees. Very curious.", "Kulit kering dan gatal di belakang lutut. Sangat ingin tahu."]),
    objective: f05("intake.objective", ["Answer each question briefly and correctly, then check the skin with Dr. Lim.", "Jawab setiap soalan dengan ringkas dan betul, kemudian periksa kulit bersama Dr. Lim."]),
  },
  steps: doctorSteps(false),
  interview: {
    intro: f05("intro.a", ["Hi doctor! My knees are itchy. Can I ask some questions? I have… a few.", "Hai doktor! Lutut saya gatal. Boleh saya tanya soalan? Saya ada… beberapa."]),
    introVariants: [
      f05("intro.b", ["Doctor, I'm doing a school project on skin. Can I interview you about my itchy knees?", "Doktor, saya buat projek sekolah tentang kulit. Boleh saya temu bual doktor pasal lutut saya yang gatal?"]),
    ],
    prompts: [],
    turns: [
      turn(f05, "why", ["First question: why does dry skin get itchy?", "Soalan pertama: kenapa kulit kering jadi gatal?"], [
        {
          id: "barrier",
          good: true,
          text: ["Dry skin has a weaker barrier, so it gets irritated and itchy more easily. Moisturiser helps protect it.", "Kulit kering ada lapisan pelindung yang lebih lemah, jadi ia mudah merengsa dan gatal. Pelembap membantu melindunginya."],
          reply: ["Like a wall with gaps! Cool. Mine is behind both knees.", "Macam dinding yang berlubang! Best. Saya punya di belakang kedua-dua lutut."],
          reaction: "bounce",
          note: ["Dry, itchy skin behind both knees", "Kulit kering dan gatal di belakang kedua-dua lutut"],
        },
        {
          id: "young",
          good: false,
          text: ["You're too young to understand.", "Awak terlalu muda untuk faham."],
          reply: ["I understand lots of things!", "Saya faham banyak benda!"],
          reaction: "tilt",
          feedback: ["Everyone deserves a clear answer. Explain simply and kindly.", "Semua orang layak mendapat jawapan yang jelas. Terangkan dengan mudah dan baik."],
        },
      ]),
      turn(f05, "scratch", ["Does scratching make it worse? Asking for a friend. The friend is me.", "Garu buat jadi lebih teruk ke? Tanya untuk kawan. Kawan tu saya."], [
        {
          id: "yes",
          good: true,
          text: ["Yes. Scratching can damage the skin and make it itchier. Try a cool cloth or moisturiser instead.", "Ya. Menggaru boleh merosakkan kulit dan buat lebih gatal. Cuba kain sejuk atau pelembap."],
          reply: ["Got it. Cool cloth, not claws.", "Faham. Kain sejuk, bukan kuku."],
          reaction: "smile",
          note: ["Scratches at night; advised cool cloth and moisturiser", "Menggaru waktu malam; dinasihatkan kain sejuk dan pelembap"],
        },
        {
          id: "fine",
          good: false,
          text: ["No, scratch as much as you like.", "Tak, garu la sebanyak mana pun."],
          reply: ["Really? That's not what my mum said…", "Betul ke? Mak saya tak cakap macam tu…"],
          reaction: "tilt",
          feedback: ["Scratching can break the skin and worsen the itch. Give safe alternatives instead.", "Menggaru boleh melukakan kulit dan memburukkan gatal. Beri alternatif yang selamat."],
        },
      ]),
      turn(f05, "glow", ["Last one, I promise: if I moisturise every day, will my skin glow in the dark?", "Yang terakhir, janji: kalau saya sapu pelembap setiap hari, kulit saya bercahaya dalam gelap tak?"], [
        {
          id: "honest",
          good: true,
          text: ["Sadly, no glowing! But it will feel softer and less itchy over time.", "Sayangnya, tak bercahaya! Tapi lama-kelamaan kulit akan rasa lebih lembut dan kurang gatal."],
          reply: ["Aww. Soft is good too.", "Alaa. Lembut pun okey juga."],
          reaction: "smile",
          note: ["Understands moisturising helps gradually", "Faham pelembap membantu secara beransur-ansur"],
        },
        {
          id: "glow",
          good: false,
          text: ["Yes, if you use enough of it!", "Ya, kalau guna cukup banyak!"],
          reply: ["REALLY?!", "BETUL KE?!"],
          reaction: "surprised",
          feedback: ["Fun to imagine, but stay accurate. Kind honesty builds trust.", "Seronok dibayangkan, tapi kekal tepat. Kejujuran yang baik membina kepercayaan."],
        },
      ]),
    ],
    outro: f05("outro", ["Thanks! Now Dr. Lim can look. I'll take notes.", "Terima kasih! Sekarang Dr. Lim boleh periksa. Saya catat nota."]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: f05("consult.intro", ["Let's look together, {name}. Tap what looks different from healthy skin.", "Jom periksa sama-sama, {name}. Ketik apa yang nampak berbeza daripada kulit sihat."]),
    spots: [
      { id: "dry", label: f05("spot.dry.label", ["Dry", "Kering"]), x: 50, y: 30, info: f05("spot.dry.info", ["Dry, flaky skin. Moisturiser helps fill those 'gaps in the wall'.", "Kulit kering bersisik. Pelembap membantu menutup 'lubang di dinding' itu."]) },
      { id: "rough", label: f05("spot.rough.label", ["Rough", "Kasar"]), x: 58, y: 82, info: f05("spot.rough.info", ["Slightly thicker skin from scratching.", "Kulit sedikit tebal akibat menggaru."]) },
    ],
    summary: f05("consult.summary", ["Dry skin with a little roughness from scratching, and no warning signs. My advice for {name}:", "Kulit kering dengan sedikit kasar akibat menggaru, dan tiada tanda amaran. Nasihat saya untuk {name}:"]),
    plan: [
      f05("plan.1", ["Moisturise twice a day, especially after bathing.", "Sapu pelembap dua kali sehari, terutama selepas mandi."]),
      f05("plan.2", ["Keep nails short and use a cool cloth when it itches.", "Pastikan kuku pendek dan guna kain sejuk bila gatal."]),
      f05("plan.3", ["Wear soft cotton clothes instead of tight, scratchy ones.", "Pakai baju kapas yang lembut, bukan yang ketat dan kasar."]),
    ],
    safety: f05("consult.safety", SAFETY),
  },
  collected: f05("collected", ["💊  {name} picked up a fragrance-free cream from Grace ✓", "💊  {name} ambil krim tanpa pewangi daripada Grace ✓"]),
  thanks: f05("thanks", ["Thanks, doctor! Best school project ever 📓", "Terima kasih, doktor! Projek sekolah terbaik 📓"]),
  takeaway: f05("takeaway", [
    "Curious patients learn best from short, accurate answers. Honest explanations, even to silly questions, build trust.",
    "Pesakit yang ingin tahu belajar terbaik daripada jawapan ringkas dan tepat. Penjelasan yang jujur, walaupun untuk soalan lucu, membina kepercayaan.",
  ]),
};

// ---------- S01 · Dry, itchy skin (calm, with Care Room care) ----------

const s01 = texts("s01");
export const S01: CaseTemplate = {
  id: "s01-dry-itchy",
  mood: "calm",
  outcome: "care",
  planKey: "s01",
  title: s01("title", ["Consultation · Dry, itchy hands", "Konsultasi · Tangan kering dan gatal"]),
  reason: s01("reason", ["Dry, itchy hands", "Tangan kering dan gatal"]),
  intake: {
    reason: s01("intake.reason", ["Dry, itchy skin on the back of the hands", "Kulit kering dan gatal di belakang tangan"]),
    objective: s01("intake.objective", ["Ask about the symptoms, look at the skin with Dr. Lim, and help with the care plan.", "Tanya tentang simptom, periksa kulit bersama Dr. Lim, dan bantu pelan rawatan."]),
  },
  steps: doctorSteps(true),
  interview: {
    intro: s01("intro.a", ["My hands have been dry and itchy lately. It's really bothering me.", "Tangan saya kering dan gatal kebelakangan ini. Sangat mengganggu."]),
    introVariants: [s01("intro.b", ["Hello doctor. My hands feel tight and itchy, especially at night.", "Helo doktor. Tangan saya rasa tegang dan gatal, terutama waktu malam."])],
    prompts: [],
    turns: [
      turn(s01, "feel", null, [
        {
          id: "kind",
          good: true,
          text: ["I'm sorry it's bothering you. How does the skin feel?", "Maaf ia mengganggu awak. Bagaimana rasa kulitnya?"],
          reply: ["Tight and itchy, and it gets worse at night.", "Tegang dan gatal, dan lebih teruk waktu malam."],
          reaction: "blink",
          note: ["Dry, tight, itchy (worse at night)", "Kering, tegang, gatal (lebih teruk waktu malam)"],
        },
        {
          id: "sooner",
          good: false,
          text: ["Why didn't you come in sooner?", "Kenapa tak datang lebih awal?"],
          reply: ["I didn't think it was serious… sorry.", "Saya ingat tak serius… maaf."],
          reaction: "shy",
          feedback: ["That sounds like blame. Asking how it feels gets the answer kindly.", "Itu bunyi seperti menyalahkan. Tanya bagaimana rasanya untuk dapat jawapan dengan baik."],
        },
      ]),
      turn(s01, "long", ["It's been like this for a while now.", "Dah agak lama macam ni."], [
        {
          id: "since",
          good: true,
          text: ["How long has it been like this?", "Sudah berapa lama jadi begini?"],
          reply: ["About two weeks, since the weather turned cold and windy.", "Lebih kurang dua minggu, sejak cuaca jadi sejuk dan berangin."],
          reaction: "thinking",
          note: ["About 2 weeks, since cold weather", "Kira-kira 2 minggu, sejak cuaca sejuk"],
        },
        {
          id: "dirty",
          good: false,
          text: ["Is it because you don't wash properly?", "Sebab awak tak basuh dengan betul ke?"],
          reply: ["But I wash my hands all the time…", "Tapi saya selalu basuh tangan…"],
          reaction: "shy",
          feedback: ["Eczema isn't caused by being dirty. A question like this can make someone feel ashamed.", "Ekzema bukan disebabkan kotor. Soalan begini boleh buat orang rasa malu."],
        },
      ]),
      turn(s01, "worse", ["I'm not sure what makes it worse.", "Saya tak pasti apa yang memburukkannya."], [
        {
          id: "triggers",
          good: true,
          text: ["Let's think together. Does anything seem to make it worse?", "Jom fikir sama-sama. Ada apa-apa yang nampaknya memburukkannya?"],
          reply: ["Washing my hands a lot, and the scented hand soap I use.", "Kerap basuh tangan, dan sabun tangan berwangi yang saya guna."],
          reaction: "thinking",
          note: ["Frequent washing, scented soap", "Kerap membasuh, sabun berwangi"],
        },
        {
          id: "scratch",
          good: false,
          text: ["Can't you just stop scratching?", "Tak boleh ke berhenti garu je?"],
          reply: ["I really try, but it's so itchy…", "Saya cuba, tapi gatal sangat…"],
          reaction: "shy",
          feedback: ["The itch is hard to ignore. Show you understand, then ask what makes it worse.", "Gatal memang susah diabaikan. Tunjukkan awak faham, kemudian tanya apa yang memburukkannya."],
        },
      ]),
    ],
    outro: s01("outro", ["That's everything, doctor. Could Dr. Lim take a look?", "Itu sahaja, doktor. Boleh Dr. Lim tolong periksa?"]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: s01("consult.intro", ["Let's compare {name}'s hand with healthy skin. Tap what looks different.", "Jom bandingkan tangan {name} dengan kulit sihat. Ketik apa yang nampak berbeza."]),
    spots: [
      { id: "dry", label: s01("spot.dry.label", ["Dry", "Kering"]), x: 50, y: 30, info: s01("spot.dry.info", ["Fine, flaky skin. Dry skin loses water easily, so it feels tight.", "Kulit halus bersisik. Kulit kering mudah hilang air, jadi rasa tegang."]) },
      { id: "red", label: s01("spot.red.label", ["Mild redness", "Kemerahan ringan"]), x: 42, y: 58, info: s01("spot.red.info", ["Slight pink patch from irritation and scratching. No swelling or oozing.", "Tompok merah jambu ringan akibat kerengsaan dan garu. Tiada bengkak atau berair."]) },
      { id: "rough", label: s01("spot.rough.label", ["Rough", "Kasar"]), x: 58, y: 82, info: s01("spot.rough.info", ["A rough, slightly thicker area where the skin has been rubbed a lot.", "Kawasan kasar dan sedikit tebal di tempat kulit kerap digosok."]) },
    ],
    summary: s01("consult.summary", ["Dry, irritated skin, and no warning signs today. Here's my plan for {name}:", "Kulit kering dan merengsa, tiada tanda amaran hari ini. Ini pelan saya untuk {name}:"]),
    plan: [
      s01("plan.1", ["In the Care Room now: a gentle wash, lukewarm rinse, pat dry, then a fragrance-free moisturiser.", "Di Bilik Rawatan sekarang: basuh lembut, bilas air suam, tepuk kering, kemudian pelembap tanpa pewangi."]),
      s01("plan.2", ["Pharmacy: Grace will hand over a fragrance-free cream for home use.", "Farmasi: Grace akan beri krim tanpa pewangi untuk kegunaan di rumah."]),
      s01("plan.3", ["Use a gentle, unscented soap and pat hands dry.", "Guna sabun lembut tanpa pewangi dan tepuk tangan sampai kering."]),
    ],
    safety: s01("consult.safety", SAFETY),
  },
  care: {
    steps: [
      { id: "wash", tools: ["soap", "water"] },
      { id: "dry", tools: ["towel"] },
      { id: "cream", tools: ["cream"] },
    ],
    tools: [
      { id: "soap", icon: "🫧", label: s01("tool.soap", ["Gentle wash", "Pencuci lembut"]) },
      { id: "water", icon: "💧", label: s01("tool.water", ["Lukewarm water", "Air suam"]) },
      { id: "towel", icon: "🧻", label: s01("tool.towel", ["Soft towel", "Tuala lembut"]) },
      { id: "cream", icon: "🧴", label: s01("tool.cream", ["Fragrance-free", "Tanpa pewangi"]) },
    ],
    spots: [],
  },
  collected: s01("collected", ["💊  Grace handed {name} a fragrance-free cream ✓", "💊  Grace beri {name} krim tanpa pewangi ✓"]),
  thanks: s01("thanks", ["Thank you, doctor! My hands feel more comfortable. I'll keep moisturising like you showed me 💜", "Terima kasih, doktor! Tangan saya rasa lebih selesa. Saya akan terus sapu pelembap macam doktor tunjuk 💜"]),
  takeaway: s01("takeaway", [
    "Moisturise gently with a fragrance-free product, use mild soap and pat dry. Eczema improves gradually with care; get checked if it oozes, spreads or there's a fever.",
    "Sapu pelembap tanpa pewangi dengan lembut, guna sabun lembut dan tepuk kering. Ekzema pulih secara beransur dengan penjagaan; dapatkan pemeriksaan jika berair, merebak atau demam.",
  ]),
};

// ---------- S02 · Worse, possibly infected (serious: no jokes, escalate) ----------

const s02 = texts("s02");
export const S02: CaseTemplate = {
  id: "s02-worsening",
  mood: "serious",
  outcome: "referral",
  planKey: "s02",
  title: s02("title", ["Consultation · Getting worse", "Konsultasi · Semakin teruk"]),
  reason: s02("reason", ["Worried: patch getting worse", "Risau: tompok semakin teruk"]),
  intake: {
    reason: s02("intake.reason", ["A patch on the hand that is getting worse and now hurts", "Tompok di tangan yang semakin teruk dan kini sakit"]),
    objective: s02("intake.objective", ["Listen carefully, ask about warning signs, and let Dr. Lim assess. Calm, clear answers only.", "Dengar dengan teliti, tanya tentang tanda amaran, dan biar Dr. Lim menilai. Jawapan tenang dan jelas sahaja."]),
  },
  steps: doctorSteps(false),
  interview: {
    intro: s02("intro.a", ["Doctor, I'm worried. The patch on my hand is getting worse, and now it hurts.", "Doktor, saya risau. Tompok di tangan saya semakin teruk, dan sekarang sakit."]),
    introVariants: [s02("intro.b", ["Doctor, something isn't right with my hand. It's sore and it's changed since yesterday.", "Doktor, ada yang tak kena dengan tangan saya. Ia sakit dan berubah sejak semalam."])],
    prompts: [],
    turns: [
      turn(s02, "change", null, [
        {
          id: "listen",
          good: true,
          text: ["I'm glad you came in. Can you tell me what has changed?", "Saya gembira awak datang. Boleh ceritakan apa yang berubah?"],
          reply: ["It's redder and warm, and some spots have been weeping yellow fluid since yesterday.", "Ia lebih merah dan panas, dan beberapa bintik berair kekuningan sejak semalam."],
          note: ["Worse over 2 days: red, warm, painful, weeping yellow fluid", "Bertambah teruk 2 hari: merah, panas, sakit, berair kekuningan"],
        },
        {
          id: "dismiss",
          good: false,
          text: ["It's probably nothing. Don't worry.", "Mungkin tiada apa-apa. Jangan risau."],
          reply: ["But it really hurts…", "Tapi ia betul-betul sakit…"],
          feedback: ["Don't dismiss worsening symptoms. Listen and ask what has changed.", "Jangan abaikan simptom yang semakin teruk. Dengar dan tanya apa yang berubah."],
        },
      ]),
      turn(s02, "fever", ["I didn't sleep well last night.", "Saya tak dapat tidur lena malam tadi."], [
        {
          id: "unwell",
          good: true,
          text: ["Have you had a fever or felt unwell?", "Ada demam atau rasa tidak sihat?"],
          reply: ["Yes, I felt feverish last night.", "Ya, saya rasa demam malam tadi."],
          note: ["Felt feverish last night", "Rasa demam malam tadi"],
        },
        {
          id: "cream",
          good: false,
          text: ["Let's just put more moisturiser on it.", "Kita sapu lebih banyak pelembap je."],
          reply: ["Will that be enough?", "Itu cukup ke?"],
          feedback: ["Pain, weeping and fever are warning signs. They need a clinician's check, not just more cream.", "Sakit, berair dan demam ialah tanda amaran. Ia perlu diperiksa klinisian, bukan sekadar lebih banyak krim."],
        },
      ]),
      turn(s02, "serious", ["Is it serious, doctor?", "Serius ke, doktor?"], [
        {
          id: "calm",
          good: true,
          text: ["These can be signs of an infection, so Dr. Lim will examine it now and arrange the right care. You did the right thing coming in.", "Ini mungkin tanda jangkitan, jadi Dr. Lim akan periksa sekarang dan aturkan rawatan yang sesuai. Awak buat keputusan yang betul dengan datang."],
          reply: ["Thank you. That makes me feel calmer.", "Terima kasih. Saya rasa lebih tenang."],
          note: ["Told calmly: Dr. Lim to examine and arrange care", "Diberitahu dengan tenang: Dr. Lim akan periksa dan aturkan rawatan"],
        },
        {
          id: "alarm",
          good: false,
          text: ["Yes, it looks very bad.", "Ya, nampak sangat teruk."],
          reply: ["Oh no…", "Alamak…"],
          feedback: ["Be honest but calm. Explain the next step without causing alarm.", "Jujur tapi tenang. Terangkan langkah seterusnya tanpa menakutkan."],
        },
      ]),
    ],
    outro: s02("outro", ["Thank you for listening. Please, let Dr. Lim take a look.", "Terima kasih kerana mendengar. Tolong biar Dr. Lim periksa."]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: s02("consult.intro", ["Thank you for flagging this. Let's look carefully. Tap what looks different.", "Terima kasih kerana memaklumkan. Jom periksa dengan teliti. Ketik apa yang nampak berbeza."]),
    spots: [
      { id: "red", label: s02("spot.red.label", ["Red, warm area", "Kawasan merah dan panas"]), x: 42, y: 58, info: s02("spot.red.info", ["Redder and warmer than the skin around it, and tender to touch.", "Lebih merah dan panas berbanding kulit sekeliling, dan sakit bila disentuh."]) },
      { id: "weeping", label: s02("spot.weeping.label", ["Weeping (reported)", "Berair (dilaporkan)"]), x: 58, y: 82, info: s02("spot.weeping.info", ["{name} reports weeping yellow fluid. With pain and fever, this is a warning sign.", "{name} melaporkan bintik berair kekuningan. Bersama sakit dan demam, ini tanda amaran."]) },
    ],
    summary: s02("consult.summary", ["These are warning signs that need a proper medical review today. I'll take it from here:", "Ini tanda amaran yang perlu dinilai secara perubatan hari ini. Saya akan uruskan:"]),
    plan: [
      s02("plan.1", ["Dr. Lim will examine {name} further and arrange the right treatment, which may include a referral.", "Dr. Lim akan memeriksa {name} dengan lebih lanjut dan mengatur rawatan yang sesuai, termasuk rujukan jika perlu."]),
      s02("plan.2", ["No Care Room session today: the skin needs a doctor's review first.", "Tiada sesi Bilik Rawatan hari ini: kulit perlu dinilai doktor dahulu."]),
      s02("plan.3", ["Don't start any new creams until a doctor has reviewed it.", "Jangan mula guna krim baru sehingga doktor menilainya."]),
    ],
    safety: s02("consult.safety", ["Get urgent help if the fever rises, the redness spreads quickly, or {name} feels very unwell.", "Dapatkan bantuan segera jika demam meningkat, kemerahan cepat merebak, atau {name} rasa sangat tidak sihat."]),
  },
  thanks: s02("thanks", ["Thank you for taking me seriously, doctor.", "Terima kasih kerana mengambil berat, doktor."]),
  takeaway: s02("takeaway", [
    "Worsening pain, weeping, spreading redness or fever are warning signs. Stay calm, listen, and get a clinician to assess quickly. This is no time for jokes.",
    "Sakit yang bertambah, berair, kemerahan yang merebak atau demam ialah tanda amaran. Bertenang, dengar, dan dapatkan penilaian klinisian dengan segera. Ini bukan masa untuk bergurau.",
  ]),
};

// ---------- S03 · Follow-up (calm; only for someone with a recorded earlier visit) ----------

const s03 = texts("s03");
export const S03: CaseTemplate = {
  id: "s03-follow-up",
  mood: "calm",
  outcome: "followup",
  planKey: "s03",
  title: s03("title", ["Follow-up · How's it going?", "Susulan · Bagaimana perkembangannya?"]),
  reason: s03("reason", ["Follow-up check", "Pemeriksaan susulan"]),
  intake: {
    reason: s03("intake.reason", ["Follow-up after the last visit's care routine", "Susulan selepas rutin penjagaan lawatan lepas"]),
    objective: s03("intake.objective", ["Ask how the routine is going and what still bothers them, then check progress with Dr. Lim.", "Tanya bagaimana rutin berjalan dan apa yang masih mengganggu, kemudian semak perkembangan bersama Dr. Lim."]),
  },
  steps: doctorSteps(false),
  interview: {
    // {lastPlan} is filled in from the patient's recorded last visit (systems/PatientHistory.ts)
    intro: s03("intro.a", ["Hi doctor! I'm back for my check-up. I've been {lastPlan}.", "Hai doktor! Saya datang untuk pemeriksaan susulan. Saya dah {lastPlan}."]),
    introVariants: [s03("intro.b", ["Hello again! Last time the plan was {lastPlan}. Here's my update.", "Helo lagi! Kali lepas pelannya {lastPlan}. Ini perkembangan saya."])],
    prompts: [],
    turns: [
      turn(s03, "routine", null, [
        {
          id: "open",
          good: true,
          text: ["Good to see you. How has the routine been going?", "Gembira jumpa awak lagi. Bagaimana rutin awak setakat ini?"],
          reply: ["Mostly good! I've kept it up most days.", "Kebanyakannya baik! Saya teruskan hampir setiap hari."],
          reaction: "smile",
          note: ["Kept up the routine most days", "Teruskan rutin hampir setiap hari"],
        },
        {
          id: "accuse",
          good: false,
          text: ["Did you actually follow the plan?", "Awak betul-betul ikut pelan tu ke?"],
          reply: ["…Yes? Mostly?", "…Ya? Kebanyakannya?"],
          reaction: "shy",
          feedback: ["That sounds like an accusation. Ask openly how it's going.", "Itu bunyi seperti menuduh. Tanya secara terbuka bagaimana perkembangannya."],
        },
      ]),
      turn(s03, "remaining", ["It's better, but not perfect.", "Dah lebih baik, tapi belum sempurna."], [
        {
          id: "still",
          good: true,
          text: ["What's still bothering you?", "Apa yang masih mengganggu awak?"],
          reply: ["A little dryness on my knuckles, and it flared once after a busy weekend.", "Sedikit kering di buku jari, dan ia naik sekali selepas hujung minggu yang sibuk."],
          reaction: "thinking",
          note: ["Some dryness left; one flare after a busy weekend", "Masih sedikit kering; naik sekali selepas hujung minggu yang sibuk"],
        },
        {
          id: "cured",
          good: false,
          text: ["Great, so you're cured now!", "Bagus, jadi awak dah sembuh sepenuhnya!"],
          reply: ["Am I? It's still a bit dry…", "Betul ke? Masih kering sikit…"],
          reaction: "tilt",
          feedback: ["Eczema improves with care but isn't simply 'cured'. Ask about the symptoms that remain.", "Ekzema bertambah baik dengan penjagaan tapi bukan sekadar 'sembuh'. Tanya tentang simptom yang masih ada."],
        },
      ]),
    ],
    outro: s03("outro", ["Could Dr. Lim check how it's looking?", "Boleh Dr. Lim tengok keadaannya sekarang?"]),
  },
  consult: {
    doctor: "Dr. Lim",
    portrait: DR_LIM,
    intro: s03("consult.intro", ["Let's see how {name}'s skin is doing. Tap what looks different from healthy skin.", "Jom tengok keadaan kulit {name}. Ketik apa yang nampak berbeza daripada kulit sihat."]),
    spots: [
      { id: "softer", label: s03("spot.softer.label", ["Softer", "Lebih lembut"]), x: 58, y: 82, info: s03("spot.softer.info", ["Smoother than before. The routine is helping.", "Lebih licin berbanding sebelum ini. Rutin itu membantu."]) },
      { id: "dry", label: s03("spot.dry.label", ["Still a bit dry", "Masih sedikit kering"]), x: 50, y: 30, info: s03("spot.dry.info", ["Some dryness remains. Skin improves gradually, so keep going.", "Masih ada sedikit kering. Kulit pulih secara beransur, jadi teruskan."]) },
    ],
    summary: s03("consult.summary", ["Good progress and no warning signs. Let's keep it going:", "Perkembangan baik dan tiada tanda amaran. Jom teruskan:"]),
    plan: [
      s03("plan.1", ["Keep moisturising twice a day, even on days the skin feels fine.", "Teruskan sapu pelembap dua kali sehari, walaupun pada hari kulit rasa baik."]),
      s03("plan.2", ["On busy days, keep a small tube of moisturiser with you.", "Pada hari sibuk, bawa tiub kecil pelembap."]),
      s03("plan.3", ["Collect a refill of the same fragrance-free cream from Grace.", "Ambil isian semula krim tanpa pewangi yang sama daripada Grace."]),
    ],
    safety: s03("consult.safety", ["Come back sooner if it flares badly, oozes, spreads, or if there's a fever.", "Datang lebih awal jika ia naik teruk, berair, merebak, atau jika demam."]),
  },
  collected: s03("collected", ["💊  {name} collected a cream refill from Grace ✓", "💊  {name} ambil isian semula krim daripada Grace ✓"]),
  thanks: s03("thanks", ["Thanks, doctor! Slow and steady. I'll keep it up 💜", "Terima kasih, doktor! Perlahan-lahan tapi pasti. Saya akan teruskan 💜"]),
  takeaway: s03("takeaway", [
    "Follow-ups check progress and the symptoms that remain. Celebrate improvement, keep the routine going, and never promise a cure.",
    "Lawatan susulan menyemak perkembangan dan simptom yang masih ada. Raikan kemajuan, teruskan rutin, dan jangan sesekali janjikan penyembuhan.",
  ]),
};

/** Short "what the plan was" lines, recalled at a follow-up ({lastPlan}). */
export const PLAN_RECALL: Record<string, string> = {
  f01: L("plan.recall.f01", "moisturising and checking new products with the clinic first", "sapu pelembap dan semak produk baru dengan klinik dahulu"),
  f02: L("plan.recall.f02", "wearing gloves with the strong cleaner", "pakai sarung tangan bila guna pencuci yang kuat"),
  f03: L("plan.recall.f03", "moisturising my wrists and loosening my watch strap", "sapu pelembap di pergelangan dan longgarkan tali jam"),
  f04: L("plan.recall.f04", "using one gentle moisturiser and pausing the scented lotion", "guna satu pelembap lembut dan berhenti guna losyen berwangi"),
  f05: L("plan.recall.f05", "moisturising after bathing and using a cool cloth instead of scratching", "sapu pelembap selepas mandi dan guna kain sejuk, bukan menggaru"),
  s01: L("plan.recall.s01", "using a gentle soap and moisturising every day", "guna sabun lembut dan sapu pelembap setiap hari"),
  s02: L("plan.recall.s02", "following Dr. Lim's treatment after the review", "ikut rawatan Dr. Lim selepas penilaian"),
  s03: L("plan.recall.s03", "keeping up the moisturising routine", "teruskan rutin sapu pelembap"),
  // earlier (Phase 3) visits
  case001: L("plan.recall.case001", "using a gentle soap and moisturising every day", "guna sabun lembut dan sapu pelembap setiap hari"),
  "itchy-patch": L("plan.recall.itchy", "moisturising the itchy patch and staying cool", "sapu pelembap pada tompok gatal dan kekal sejuk"),
  "follow-up": L("plan.recall.followup", "keeping up the moisturising routine", "teruskan rutin sapu pelembap"),
};
export const PLAN_RECALL_FALLBACK = L("plan.recall.generic", "following the care plan", "ikut pelan penjagaan");

/** The eight Phase 5 visit templates (5 funny, 3 calm/serious). */
export const PHASE5_SCENARIOS: CaseTemplate[] = [F01, F02, F03, F04, F05, S01, S02, S03];
