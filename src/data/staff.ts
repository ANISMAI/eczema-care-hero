// Staff directory: one ID card per staff member, shown from the HUD's "Staff" button.
// Wording is friendly and non-clinical (Phase 1 content rules): roles describe what each person
// helps visitors with in the game, not medical advice.

import type { CharacterId } from "./assets";
import type { RoomId } from "./rooms";

export interface StaffCard {
  id: string;
  name: string;
  role: string;
  /** Where to find them (also used by the card's Find button). */
  room: RoomId;
  staffNo: string;
  /** Card accent colour (CSS). */
  accent: string;
  /**
   * Sharp head-and-shoulders photo, made from the full-size AI source sheet with
   * tools/make-portrait.py (the in-game sprites are too small to show this large).
   */
  portrait: string;
  helps: string[];
  about: string;
  /** Set for the playable doctors: the card of the chosen character is marked "You". */
  characterId?: CharacterId;
  /** NPC id in npcs.ts, so Find can go to where they are right now. */
  npcId?: string;
  /** Interactable to meet them at instead (e.g. the front of the counter they stand behind). */
  meetAt?: string;
}

export const STAFF: StaffCard[] = [
  {
    id: "dr-nadia",
    portrait: "assets/portraits/dr-nadia.webp",
    name: "Dr. Nadia",
    role: "Clinic Doctor",
    room: "consult",
    staffNo: "ECC-0101",
    accent: "#9a7fd1",
    helps: ["Meets visitors in the Consultation room", "Explains gentle daily skin-care habits", "Guides the team through the day"],
    about: "Loves gardening and always carries a lavender pen.",
    characterId: "doctor-hijab",
  },
  {
    id: "dr-faris",
    portrait: "assets/portraits/dr-faris.webp",
    name: "Dr. Faris",
    role: "Clinic Doctor",
    room: "consult",
    staffNo: "ECC-0102",
    accent: "#7a55d6",
    helps: ["Meets visitors in the Consultation room", "Answers questions about clinic visits", "Coaches new team members"],
    about: "Weekend badminton champion of the staff league.",
    characterId: "doctor-man",
  },
  {
    id: "nurul",
    portrait: "assets/portraits/nurul.webp",
    name: "Nurul Huda",
    role: "Receptionist",
    room: "reception",
    staffNo: "ECC-0201",
    accent: "#f07f2e",
    helps: ["Welcomes you at the front desk", "Registration and the visitor queue (coming soon)", "Points you to the right room"],
    about: "Remembers every regular visitor's name.",
    npcId: "receptionist",
    meetAt: "reception-desk",
  },
  {
    id: "jason",
    portrait: "assets/portraits/jason.webp",
    name: "Jason Lim",
    role: "Staff Nurse",
    room: "care",
    staffNo: "ECC-0301",
    accent: "#2f7fe0",
    helps: ["Keeps the hallway and rooms running smoothly", "Helps visitors find their way", "Lends a hand wherever it's needed"],
    about: "Walks over 10,000 steps every shift.",
    npcId: "nurse-jason",
  },
  {
    id: "amy",
    portrait: "assets/portraits/amy.webp",
    name: "Amy Lee",
    role: "Staff Nurse",
    room: "care",
    staffNo: "ECC-0302",
    accent: "#1fa67a",
    helps: ["Prepares the Care Room for each visit", "Keeps everything clean and comfortable", "Makes nervous visitors feel at ease"],
    about: "Bakes cookies for the Staff Lounge on Fridays.",
    npcId: "nurse-amy",
  },
  {
    id: "grace",
    portrait: "assets/portraits/grace.webp",
    name: "Grace Tan",
    role: "Pharmacist",
    room: "pharmacy",
    staffNo: "ECC-0401",
    accent: "#a07ee0",
    helps: ["Runs the Pharmacy counter", "Hands over products after a consultation (coming soon)", "Answers questions about product labels"],
    about: "Has a collection of 40 pairs of glasses.",
    npcId: "pharmacist",
    meetAt: "pharmacy-counter",
  },
  {
    id: "ravi",
    portrait: "assets/portraits/ravi.webp",
    name: "Ravi Kumar",
    role: "Storekeeper",
    room: "storage",
    staffNo: "ECC-0501",
    accent: "#e5a417",
    helps: ["Keeps every shelf stocked and labelled", "Supply missions (coming soon)", "Knows where everything is kept"],
    about: "Can find any box in the storeroom with his eyes closed.",
    npcId: "storekeeper",
  },
];
