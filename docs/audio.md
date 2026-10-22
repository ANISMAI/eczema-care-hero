# Runtime audio

All audio is synthesized with Web Audio; there are no audio assets or added dependencies.
The existing queue announcements still use Web Speech and follow the Effects switch.

`src/game/audio.ts` owns the only AudioContext, created after a pointer or keyboard gesture.
Phaser's unused audio manager is disabled to avoid a second context. Ambience, Effects and
Music have separate gains and saved switches. The old Sound switch aliases Effects; an old
save with Sound off migrates all three switches off. Hidden tabs suspend the context and
cancel speech; returning resumes it, with another gesture available if mobile audio was interrupted.

The title has an eight-bar, 96 BPM tune with a short scheduling window. It fades away on
entry. The shift summary has a 2.6-second jingle. No music runs during clinic play.

The clinic reuses six continuous sources (air, AC, three crowd bands and a hoverboard motor).
Control values update four times a second, with 1.5-second crowd/room ramps. Visitor count
uses a capped square-root curve so a full queue stays comfortable. Panels reduce ambience
to 70%; private rooms carry 10% of the lobby crowd mix. Room changes update the target
immediately. Before opening there is only near-silent AC, with no crowd or random activity.
Ambient one-shots occur every 6–20 seconds while open; arcade bleeps use the ambience bus.
The giggle is a short pitched approximation, not recorded speech. The water effect is a
short burst to match the requested maximum effect duration, while the washing animation continues.

One-shots share a generated noise buffer, disconnect on completion, and have a 32-source
budget. Named effects are at least 80 ms apart (signature strokes: 130 ms). Delegated UI
clicks yield to event-specific audio, with an explicit opt-out for buttons that own their sound.

Files added:

- `src/game/audio.ts`
- `src/systems/Ambience.ts`
- `tests/audio.test.mjs`
- `docs/audio.md`

Files updated:

- `src/game/settings.ts`, `src/game/i18n.ts`, `src/game/config.ts`, `src/main.ts`
- `src/scenes/ClinicScene.ts`, `src/clinic/ClinicFlow.ts`, `src/events/EventDirector.ts`
- `src/mission/CaseRunner.ts`, `src/systems/MorningRoutine.ts`
- `src/ui/TitleScreen.ts`, `src/ui/ShiftSummary.ts`, `src/ui/ClockIn.ts`, `src/ui/IncomingCall.ts`
- `src/ui/case/Announcement.ts`, `Interview.ts`, `Consultation.ts`, `Treatment.ts`
- `src/ui/events/EventNotice.ts`, `DeliveryPanel.ts`, `PrinterPanel.ts`, `CockroachPanel.ts`
- `package.json` (includes audio tests in the existing test command)

Existing uncommitted outfit, patient history, queue and voice changes were preserved.

Validation:

- Node tests cover settings migration/persistence, per-room mixing, crowd volume, rate
  limiting, node reuse, panel ducking, motor movement, title cleanup and ambient scheduling.
- Local headless Chrome checks cover gesture-gated startup, independent saved switches,
  title fade, pre-opening quiet, lobby/office crowd changes, all named synths, gameplay
  triggers, visibility suspend/resume and a mobile viewport with touch unlocking. No game
  console exceptions were observed. Source/gain checks verify synthesis and routing;
  these checks do not replace listening on a physical device.
- Actual iOS Safari and Android hardware were not available for testing.
