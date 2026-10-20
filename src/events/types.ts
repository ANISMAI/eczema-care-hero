import type { RoomId } from "../data/rooms";

// Optional clinic events (revised Phase 2 brief, sections 06 and 07).
// Lifecycle: idle → available → accepted → resolved | dismissed | expired.
// "Later" returns an accepted event to available. Events never block the patient case.

export type EventOutcome = "resolved" | "later" | "dismissed";

export interface EventRewards {
  coins: number;
  xp: number;
}

/** The close-up panel for one event type. */
export interface EventPanel {
  readonly isOpen: boolean;
  /** `seed` picks the variation (stable across a refresh); `done` is called exactly once. */
  open(seed: number, rewards: EventRewards, done: (outcome: EventOutcome) => void): void;
}

export interface ClinicEventDef {
  id: string;
  /** Short title for the HUD chip ("Registration error"). */
  title: string;
  icon: string;
  /** Room the player must visit; marked with "!" on both maps. */
  room: RoomId;
  /** Interactables in that room that open the event (first one is where "Go" walks to). */
  targets: string[];
  /** Interact-button label at a target. */
  actionLabel: string;
  /** Who asks for help, and the notification text. */
  from: { name: string; portrait: string };
  notice: string;
  /** Toast when the event expires unanswered (no penalty). */
  expired: string;
  rewards: EventRewards;
  createPanel(parent: HTMLElement): EventPanel;
}
