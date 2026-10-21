// Developer panel (npm run dev only; never in a production build): jump straight to any
// activity, event or screen, choose the patient and visit, and control the clock, so a single
// screen can be checked without playing through the whole day. Opened with the small DEV tab
// on the right edge, or the ` (backtick) key.

export interface DevApi {
  patients: { id: string; name: string }[];
  visits: { id: string; title: string; care: boolean }[];
  events: { id: string; title: string }[];
  openCase(identityId: string, templateId: string, stage: "interview" | "consult" | "care"): string | null;
  openEvent(id: string): void;
  clockIn(): void;
  briefing(): void;
  summary(): void;
  title(): void;
  setClock(minutes: number): void;
  setSpeed(x: number): void;
  addPatient(): void;
  fillQueue(): void;
  status(): string;
  reset(): void;
}

import "./devpanel.css";

const STORE = "eczema-care-hero-devpanel";

export default class DevPanel {
  private root: HTMLDivElement;
  private body: HTMLDivElement;
  private statusLine: HTMLDivElement;
  private api: DevApi;
  private patient: HTMLSelectElement;
  private visit: HTMLSelectElement;

  constructor(parent: HTMLElement, api: DevApi) {
    this.api = api;
    this.root = document.createElement("div");
    this.root.className = "devp";
    const tab = document.createElement("button");
    tab.className = "devp-tab";
    tab.type = "button";
    tab.textContent = "DEV";
    tab.addEventListener("click", () => this.toggle());
    this.body = document.createElement("div");
    this.body.className = "devp-body";
    this.statusLine = document.createElement("div");
    this.statusLine.className = "devp-status";
    this.root.append(tab, this.body);

    // patient + visit pickers (remembered)
    const saved = this.load();
    this.patient = this.select(api.patients.map((p) => [p.id, p.name]), saved.patient);
    this.visit = this.select(api.visits.map((v) => [v.id, v.title]), saved.visit);
    const remember = () => this.save();
    this.patient.addEventListener("change", remember);
    this.visit.addEventListener("change", remember);

    const caseBtn = (label: string, stage: "interview" | "consult" | "care") =>
      this.button(label, () => {
        let visit = this.visit.value;
        // the Care Room needs a visit whose plan includes hands-on care
        if (stage === "care" && !api.visits.find((v) => v.id === visit)?.care) visit = api.visits.find((v) => v.care)!.id;
        const err = api.openCase(this.patient.value, visit, stage);
        if (err) this.flash(err);
        else this.close();
      });

    this.body.append(
      this.heading("Patient case"),
      this.row(this.labelled("Patient", this.patient), this.labelled("Visit", this.visit)),
      this.grid(caseBtn("Interview", "interview"), caseBtn("Consultation", "consult"), caseBtn("Care Room", "care")),
      this.heading("Events"),
      this.grid(...api.events.map((e) => this.button(e.title, () => (api.openEvent(e.id), this.close())))),
      this.heading("Screens"),
      this.grid(
        this.button("Title", () => (api.title(), this.close())),
        this.button("Briefing", () => (api.briefing(), this.close())),
        this.button("Clock-in", () => (api.clockIn(), this.close())),
        this.button("Day summary", () => (api.summary(), this.close()))
      ),
      this.heading("Day"),
      this.grid(
        ...[
          ["8:00", 480],
          ["12:00", 720],
          ["1:00 PM", 780],
          ["4:55 PM", 1015],
        ].map(([l, m]) => this.button(`Clock ${l}`, () => api.setClock(m as number)))
      ),
      this.speedRow(),
      this.grid(
        this.button("+ Patient", () => api.addPatient()),
        this.button("Fill queue", () => api.fillQueue()),
        this.button("Reset save", () => {
          if (confirm("Erase all saved progress and reload?")) api.reset();
        })
      ),
      this.statusLine
    );
    parent.append(this.root);

    window.addEventListener("keydown", (e) => {
      if (e.key === "`") this.toggle();
    });
    window.setInterval(() => {
      if (this.root.classList.contains("open")) this.statusLine.textContent = api.status();
    }, 400);
  }

  private toggle(): void {
    this.root.classList.toggle("open");
    this.statusLine.textContent = this.api.status();
  }

  private close(): void {
    this.root.classList.remove("open");
  }

  private flash(text: string): void {
    this.statusLine.textContent = `⚠ ${text}`;
  }

  // ---------- small builders ----------

  private button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "devp-btn";
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  private heading(text: string): HTMLElement {
    const h = document.createElement("div");
    h.className = "devp-h";
    h.textContent = text;
    return h;
  }

  private grid(...items: HTMLElement[]): HTMLElement {
    const g = document.createElement("div");
    g.className = "devp-grid";
    g.append(...items);
    return g;
  }

  private row(...items: HTMLElement[]): HTMLElement {
    const r = document.createElement("div");
    r.className = "devp-row";
    r.append(...items);
    return r;
  }

  private labelled(text: string, el: HTMLElement): HTMLElement {
    const l = document.createElement("label");
    l.className = "devp-field";
    const s = document.createElement("span");
    s.textContent = text;
    l.append(s, el);
    return l;
  }

  private select(options: [string, string][], value?: string): HTMLSelectElement {
    const s = document.createElement("select");
    for (const [v, t] of options) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      s.append(o);
    }
    if (value && options.some(([v]) => v === value)) s.value = value;
    return s;
  }

  private speedRow(): HTMLElement {
    const r = document.createElement("div");
    r.className = "devp-speed";
    const label = document.createElement("span");
    label.textContent = "Speed";
    r.append(label);
    const buttons = [1, 5, 10, 30].map((x) => {
      const b = this.button(`x${x}`, () => {
        this.api.setSpeed(x);
        buttons.forEach((o) => o.classList.toggle("on", o === b));
      });
      b.classList.toggle("on", x === 1);
      return b;
    });
    r.append(...buttons);
    return r;
  }

  private load(): { patient?: string; visit?: string } {
    try {
      return JSON.parse(localStorage.getItem(STORE) ?? "{}");
    } catch {
      return {};
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORE, JSON.stringify({ patient: this.patient.value, visit: this.visit.value }));
    } catch {
      // storage unavailable
    }
  }
}
