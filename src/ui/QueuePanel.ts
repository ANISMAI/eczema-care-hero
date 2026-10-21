import { el } from "./case/Overlay";
import type { QueueEntry } from "../clinic/ClinicFlow";
import { t } from "../game/i18n";

/**
 * The doctor queue (Phase 3 section 6), a horizontal panel under the mini-map: one face per
 * waiting patient in arrival order, each in a patience ring that drains
 * green → yellow → orange. Only doctor patients appear here; routine Nurul / Grace visitors never
 * do. Tapping it walks the doctor to the Consultation desk. Hidden when nobody is waiting.
 */
export default class QueuePanel {
  private root: HTMLButtonElement;
  private faces: HTMLDivElement;
  private count: HTMLSpanElement;
  private key = "";

  constructor(mount: HTMLElement, onTap: () => void) {
    this.root = el("button", "queue-strip hidden");
    const label = el("span", "queue-label");
    this.count = el("span", "queue-count");
    label.append(document.createTextNode(t("hud.waiting")), this.count);
    this.faces = el("div", "queue-faces");
    this.root.append(label, this.faces);
    this.root.addEventListener("click", onTap);
    mount.append(this.root);
  }

  /** Called every frame; rebuilds faces only when who is waiting changes. */
  update(queue: QueueEntry[]): void {
    this.root.classList.toggle("hidden", !queue.length);
    if (!queue.length) {
      this.key = "";
      return;
    }
    const key = queue.map((q) => q.instanceId).join(",");
    if (key !== this.key) {
      this.key = key;
      this.count.textContent = String(queue.length);
      this.root.setAttribute("aria-label", `Waiting for the doctor: ${queue.map((q) => `${q.name} (${q.reason})`).join(", ")}. Tap to go to the Consultation desk.`);
      this.faces.replaceChildren(
        ...queue.map((q, i) => {
          const ring = el("span", i === 0 ? "queue-ring first" : "queue-ring");
          ring.dataset.id = q.instanceId;
          ring.title = `${q.name} · ${q.reason}`;
          const face = el("span", "queue-face");
          if (q.portrait.includes("/")) {
            const img = el("img");
            img.src = q.portrait;
            img.alt = "";
            face.append(img);
          } else face.textContent = q.portrait;
          ring.append(face);
          return ring;
        })
      );
    }
    // patience rings change every frame
    for (const q of queue) {
      const ring = this.faces.querySelector<HTMLElement>(`[data-id="${q.instanceId}"]`);
      if (!ring) continue;
      const color = q.patience < 0.3 ? "#ff8a65" : q.patience < 0.6 ? "#ffcf3a" : "#4fd1a1";
      ring.style.setProperty("--p", `${Math.round(q.patience * 360)}deg`);
      ring.style.setProperty("--c", color);
    }
  }
}
