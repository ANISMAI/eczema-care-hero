import { REWARDS } from "../data/gameplay";
import RegistrationPanel from "../ui/events/RegistrationPanel";
import ShelfPanel, { PHARMACY_SORT, RESTOCK } from "../ui/events/ShelfPanel";
import PharmacyCheckPanel from "../ui/events/PharmacyCheckPanel";
import type { ClinicEventDef } from "./types";

// Optional event catalogue. Room problems happen now and then, not every day (brief section 06);
// the scheduler picks from this list. Future events (queue complaint, missing file, staff
// drink...) are added here with their own panel.

export const EVENTS: ClinicEventDef[] = [
  {
    id: "registration-error",
    title: "Registration error",
    icon: "🛎️",
    room: "reception",
    targets: ["reception-desk"],
    actionLabel: "❗ Help with registration",
    from: { name: "Nurul · Reception", portrait: "assets/portraits/nurul.webp" },
    notice: "A walk-in's details don't match our records. Could you help me check?",
    expired: "✅  Nurul sorted out the registration. No worries!",
    rewards: { ...REWARDS.event },
    createPanel: (parent) => new RegistrationPanel(parent),
  },
  {
    id: "low-stock",
    title: "Low stock in Storage",
    icon: "📦",
    room: "storage",
    targets: ["storage-shelf", "storekeeper"],
    actionLabel: "❗ Restock the shelf",
    from: { name: "Ravi · Storage", portrait: "assets/portraits/ravi.webp" },
    notice: "One of our shelves is empty. Could you pop over to Storage and restock it?",
    expired: "✅  Ravi restocked the shelf himself. All good!",
    rewards: { ...REWARDS.event },
    createPanel: (parent) => new ShelfPanel(parent, RESTOCK),
  },
  {
    id: "pharmacy-check",
    title: "Pharmacy: which item?",
    icon: "💊",
    room: "pharmacy",
    targets: ["pharmacy-counter"],
    actionLabel: "❗ Help Grace check",
    from: { name: "Grace · Pharmacy", portrait: "assets/portraits/grace.webp" },
    notice: "I'm not sure which product matches this care card. Could you double-check it with me?",
    expired: "✅  Grace checked the card with Dr. Lim. All sorted!",
    rewards: { ...REWARDS.event },
    createPanel: (parent) => new PharmacyCheckPanel(parent),
  },
  {
    id: "pharmacy-shelf",
    title: "Pharmacy shelf mix-up",
    icon: "🗂️",
    room: "pharmacy",
    targets: ["pharmacy-counter"],
    actionLabel: "❗ Sort the shelf",
    from: { name: "Grace · Pharmacy", portrait: "assets/portraits/grace.webp" },
    notice: "A delivery got mixed up and my shelf is a mess. Could you help me put things back?",
    expired: "✅  Grace tidied the shelf herself. Thanks anyway!",
    rewards: { ...REWARDS.event },
    createPanel: (parent) => new ShelfPanel(parent, PHARMACY_SORT),
  },
];

export function getEvent(id: string): ClinicEventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}
