import { REWARDS } from "../data/gameplay";
import RegistrationPanel from "../ui/events/RegistrationPanel";
import ShelfPanel, { PHARMACY_SORT, RESTOCK } from "../ui/events/ShelfPanel";
import PharmacyCheckPanel from "../ui/events/PharmacyCheckPanel";
import DeliveryPanel from "../ui/events/DeliveryPanel";
import TrayCleanPanel from "../ui/events/TrayCleanPanel";
import CockroachPanel from "../ui/events/CockroachPanel";
import PrinterPanel from "../ui/events/PrinterPanel";
import { t } from "../game/i18n";
import type { ClinicEventDef } from "./types";

// The eight optional incidents share one scheduler and reward channel.
// The tray is condition-driven; all other incidents participate in weighted draws.

export const EVENTS: ClinicEventDef[] = [
  {
    id: "cockroach-panic", title: t("roach.title"), icon: "☕", category: "comedy",
    room: "lounge", targets: ["lounge-coffee"], actionLabel: t("roach.action"),
    from: { name: t("roach.from"), portrait: "assets/portraits/amy.webp" },
    notice: t("roach.notice"), repeatNotices: [t("roach.repeat1"), t("roach.repeat2")],
    expired: t("roach.expired"), rewards: { ...REWARDS.event },
    createPanel: parent => new CockroachPanel(parent),
  },
  {
    id: "printer-panic", title: t("printer.title"), icon: "🖨️", category: "comedy",
    room: "office", targets: ["office-printer"], actionLabel: t("printer.action"),
    from: { name: t("printer.from"), portrait: "assets/portraits/nurul.webp" },
    notice: t("printer.notice"), repeatNotices: [t("printer.repeat1"), t("printer.repeat2")],
    expired: t("printer.expired"), rewards: { ...REWARDS.event },
    createPanel: parent => new PrinterPanel(parent),
  },
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
  {
    // not random: offered when a care tray is used while Nurse Amy is busy (systems/CareTrays.ts)
    id: "tray-cleaning",
    title: "Clean a used care tray",
    icon: "🧽",
    room: "care",
    targets: ["care-sink"],
    actionLabel: "❗ Clean the used tray",
    from: { name: "Nurse Amy · Care Room", portrait: "assets/portraits/amy.webp" },
    notice: "My hands are full with the bed linen! Could you clean the used care tray at the sink?",
    expired: "✨  Nurse Amy found a moment and cleaned the tray",
    rewards: { ...REWARDS.event },
    random: false,
    createPanel: (parent) => new TrayCleanPanel(parent),
  },
  {
    // not random: offered once when the clinic opens (ClinicScene.openClinic), so the first
    // half hour of the day has something to do besides the patients queuing at the door
    id: "morning-delivery",
    title: t("delivery.title"),
    icon: "🚚",
    category: "routine",
    room: "storage",
    targets: ["storage-shelf", "storekeeper"],
    actionLabel: t("delivery.action"),
    from: { name: "Ravi · Storage", portrait: "assets/portraits/ravi.webp" },
    notice: t("delivery.notice"),
    expired: t("delivery.expired"),
    rewards: { ...REWARDS.event },
    random: false,
    createPanel: (parent) => new DeliveryPanel(parent),
  },
];

export function getEvent(id: string): ClinicEventDef | undefined {
  return EVENTS.find((e) => e.id === id);
}
