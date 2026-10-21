import { randomVehicle } from "../art/vehicles";
import type { Town } from "../art/town";

// Cars, delivery riders and the odd ambulance driving along the town road on the title screen.
// Vehicles are SVG groups in a layer over the town image (same coordinates as the image), so
// they move with it when the camera dives into the clinic. Each lane keeps its spacing: a new
// vehicle never goes faster than the one ahead of it, so nothing overlaps.

const SVG_NS = "http://www.w3.org/2000/svg";
const GAP = 150; // free road needed behind the last vehicle before a new one enters
const SPAWN_MS = { min: 1300, max: 3200 };

interface Moving {
  el: SVGGElement;
  lane: number;
  x: number;
  speed: number;
  length: number;
}

export default class TownTraffic {
  readonly svg: SVGSVGElement;
  private town: Town;
  private layers: SVGGElement[];
  private vehicles: Moving[] = [];
  private nextSpawn = 0;
  private last = 0;
  private raf = 0;

  constructor(town: Town) {
    this.town = town;
    this.svg = document.createElementNS(SVG_NS, "svg");
    this.svg.setAttribute("class", "town-traffic");
    this.svg.setAttribute("viewBox", `0 0 ${town.size} ${town.size}`);
    this.svg.setAttribute("aria-hidden", "true");
    // the upper lane is further away, so it is drawn first
    this.layers = town.lanes.map(() => {
      const g = document.createElementNS(SVG_NS, "g");
      this.svg.append(g);
      return g;
    });
  }

  start(): void {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // a couple already on the road, so it isn't empty when the clouds part
    this.town.lanes.forEach((_, lane) => this.spawn(lane, this.town.size * (0.2 + Math.random() * 0.6)));
    this.last = performance.now();
    this.nextSpawn = this.last + 900;
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private spawn(lane: number, at?: number): boolean {
    const { dir } = this.town.lanes[lane];
    const start = dir === 1 ? -120 : this.town.size + 120;
    const v = randomVehicle();
    const len = v.art.length * this.town.vehicleScale;
    // the vehicle ahead in this lane (the most recent one)
    const ahead = [...this.vehicles].reverse().find((m) => m.lane === lane);
    if (ahead && at === undefined) {
      const room = dir === 1 ? ahead.x - ahead.length / 2 - start : start - (ahead.x + ahead.length / 2);
      if (room < len / 2 + GAP) return false;
    }
    const el = document.createElementNS(SVG_NS, "g");
    el.innerHTML = v.art.svg;
    el.setAttribute("class", `tv tv-${v.kind}`);
    this.layers[lane].append(el);
    const m: Moving = { el, lane, x: at ?? start, speed: ahead ? Math.min(v.speed, ahead.speed) : v.speed, length: len };
    this.place(m);
    this.vehicles.push(m);
    return true;
  }

  private place(m: Moving): void {
    const { dir, y } = this.town.lanes[m.lane];
    const s = this.town.vehicleScale;
    m.el.setAttribute("transform", `translate(${m.x.toFixed(1)} ${y}) scale(${dir * s} ${s})`);
  }

  private frame(now: number): void {
    // the title screen has gone (Enter): stop
    if (!this.svg.isConnected) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    for (const m of this.vehicles) {
      m.x += m.speed * dt * this.town.lanes[m.lane].dir;
      this.place(m);
    }
    this.vehicles = this.vehicles.filter((m) => {
      const gone = m.x < -200 || m.x > this.town.size + 200;
      if (gone) m.el.remove();
      return !gone;
    });
    if (now >= this.nextSpawn) {
      const first = Math.floor(Math.random() * this.town.lanes.length);
      const ok = this.spawn(first) || this.spawn((first + 1) % this.town.lanes.length);
      this.nextSpawn = now + (ok ? SPAWN_MS.min + Math.random() * (SPAWN_MS.max - SPAWN_MS.min) : 400);
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }
}
