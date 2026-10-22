import { play } from "../../game/audio";
import { createPenSound } from "../../game/pen";
import Overlay, { el, feedback } from "../case/Overlay";
import { icon, type IconName } from "../icons";
import { lang } from "../../game/i18n";
import type { EventOutcome, EventPanel, EventRewards } from "../../events/types";
import "./delivery.css";

// Morning delivery (offered when the clinic opens): how a clinic really receives stock.
//   1. open the courier's box
//   2. check each item against the invoice: accept it, or return the one with a problem
//      (expired, damaged, or not what was ordered); a wrong call only gets a kind hint
//   3. sign the delivery note with a finger
// Strings are bilingual here (en / ms) because this panel is new content written in both.

type Text = { en: string; ms: string };
const tx = (s: Text) => s[lang()];

interface Supply {
  icon: IconName;
  name: Text;
}

const SUPPLIES: Supply[] = [
  { icon: "gloves", name: { en: "Gloves", ms: "Sarung tangan" } },
  { icon: "plaster", name: { en: "Plasters", ms: "Plaster" } },
  { icon: "gauze", name: { en: "Gauze", ms: "Kain kasa" } },
  { icon: "cream-tub", name: { en: "Moisturising cream", ms: "Krim pelembap" } },
  { icon: "soap", name: { en: "Gentle wash", ms: "Pencuci lembut" } },
  { icon: "mask", name: { en: "Face masks", ms: "Pelitup muka" } },
];

type Problem = "expired" | "damaged" | "wrong";

const PROBLEMS: Record<Problem, { tag: Text; why: Text }> = {
  expired: {
    tag: { en: "Exp 11/2025", ms: "Luput 11/2025" },
    why: { en: "Look at the date: it expired before this delivery. Expired stock goes back.", ms: "Lihat tarikhnya: dah luput sebelum penghantaran ini. Stok luput mesti dipulangkan." },
  },
  damaged: {
    tag: { en: "Box crushed, leaking", ms: "Kotak remuk, bocor" },
    why: { en: "The box is crushed and leaking, so it may not be clean inside. Return it.", ms: "Kotak remuk dan bocor, jadi isinya mungkin tak bersih. Pulangkan." },
  },
  wrong: {
    tag: { en: "Not on the invoice", ms: "Tiada dalam invois" },
    why: { en: "Scented lotion isn't on our invoice, and scents can irritate eczema skin. Return it.", ms: "Losyen berwangi tiada dalam invois, dan bau wangi boleh merengsakan kulit ekzema. Pulangkan." },
  },
};

const WRONG_ITEM: Supply = { icon: "scented", name: { en: "Scented body lotion", ms: "Losyen badan berwangi" } };

const S = {
  title: { en: "Morning delivery", ms: "Penghantaran pagi" },
  who: { en: "Encik Ravi · Storage", ms: "Encik Ravi · Stor" },
  boxSpeech: { en: "The courier just dropped this off. Open the box and let's check it against the invoice.", ms: "Kurier baru hantar kotak ni. Buka kotak dan kita semak dengan invois." },
  tapBox: { en: "Tap the box to open it", ms: "Ketik kotak untuk buka" },
  checkSpeech: { en: "Check every item: does it match the invoice, is the date fine and is the box in good shape?", ms: "Semak setiap barang: sama dengan invois, tarikh masih elok dan kotak dalam keadaan baik?" },
  invoice: { en: "Invoice", ms: "Invois" },
  invoiceNo: { en: "Delivery date: 03/2026", ms: "Tarikh hantar: 03/2026" },
  qty: { en: "Qty", ms: "Kuantiti" },
  accept: { en: "Accept", ms: "Terima" },
  ret: { en: "Return", ms: "Pulangkan" },
  accepted: { en: "Accepted", ms: "Diterima" },
  returned: { en: "Returned", ms: "Dipulangkan" },
  goodHint: { en: "This one looks fine: it's on the invoice, in date and undamaged. Keep it!", ms: "Yang ini elok: ada dalam invois, belum luput dan tak rosak. Simpan!" },
  sorted: { en: "{n} of {total} checked", ms: "{n} daripada {total} disemak" },
  signSpeech: { en: "All checked! Sign the delivery note so the courier can go.", ms: "Semua dah disemak! Tandatangan nota penghantaran supaya kurier boleh pergi." },
  received: { en: "Received", ms: "Diterima" },
  returning: { en: "Returned", ms: "Dipulangkan" },
  signHere: { en: "Sign here", ms: "Tandatangan di sini" },
  clear: { en: "Clear", ms: "Padam" },
  confirm: { en: "Confirm receipt", ms: "Sahkan penerimaan" },
  thanks: { en: "Thanks! The good stock is on the shelf and the courier is taking the other one back.", ms: "Terima kasih! Stok yang elok dah di rak dan kurier bawa balik yang bermasalah." },
  done: { en: "Done", ms: "Selesai" },
  later: { en: "Later", ms: "Nanti" },
  skip: { en: "Skip this request", ms: "Langkau permintaan ini" },
} satisfies Record<string, Text>;

interface Line {
  supply: Supply;
  qty: number;
  exp: string;
  problem: Problem | null;
  state: "open" | "accepted" | "returned";
}

/** Four boxes from the seed; exactly one has a problem. */
function makeLines(seed: number): { invoice: Line[]; box: Line[] } {
  const picks: Supply[] = [];
  for (let k = 0; picks.length < 4; k++) {
    const s = SUPPLIES[(seed + k * 5) % SUPPLIES.length];
    if (!picks.includes(s)) picks.push(s);
  }
  const bad = seed % 4;
  const problem = (["expired", "damaged", "wrong"] as Problem[])[(seed >> 2) % 3];
  const invoice = picks.map((supply, i) => ({ supply, qty: 2 + ((seed >> 3) + i) % 4, exp: `${["06", "09", "12", "03"][i]}/${2027 + (i % 2)}`, problem: null, state: "open" as const }));
  const box = invoice.map((line, i) =>
    i !== bad ? { ...line } : { ...line, supply: problem === "wrong" ? WRONG_ITEM : line.supply, exp: problem === "expired" ? "11/2025" : line.exp, problem }
  );
  return { invoice, box };
}

export default class DeliveryPanel implements EventPanel {
  private overlay: Overlay;
  private stopSignature = () => {};

  constructor(parent: HTMLElement) {
    this.overlay = new Overlay(parent, "event-panel delivery-event");
  }

  get isOpen(): boolean {
    return this.overlay.isOpen;
  }

  close(): void {
    this.overlay.close();
  }

  open(seed: number, rewards: EventRewards, done: (o: EventOutcome) => void): void {
    this.stopSignature();
    const { invoice, box } = makeLines(seed);
    let outcome: EventOutcome = "later";
    this.overlay.setHeader({ title: tx(S.title), avatar: "assets/portraits/ravi.webp", subtitle: tx(S.who) });

    const later = el("button", "secondary-btn", tx(S.later));
    later.addEventListener("click", () => this.overlay.close());
    const skip = el("button", "link-btn", tx(S.skip));
    skip.addEventListener("click", () => {
      outcome = "dismissed";
      this.overlay.close();
    });
    const footer = (primary?: HTMLButtonElement) => {
      const actions = el("div", "event-actions");
      actions.append(later);
      if (primary) actions.append(primary);
      this.overlay.footer.replaceChildren(actions, skip);
    };

    // ---------- 1. the box ----------
    const showBox = () => {
      const carton = el("button", "dl-box");
      carton.dataset.audio = "own";
      carton.type = "button";
      carton.setAttribute("aria-label", tx(S.tapBox));
      // back to front: the dark opening, the items (hidden behind the front until they pop
      // up), the cardboard front with its sticker, and the taped lid on top
      const pops = box.slice(0, 3).map((line, i) => `<span class="dl-pop" style="--i:${i}">${icon(line.supply.icon)}</span>`).join("");
      carton.innerHTML =
        `<span class="dl-inside"></span>${pops}` +
        '<span class="dl-front"><span class="dl-sticker"><b>ECZEMA CARE CLINIC</b><small>STORAGE · FRAGILE ☂</small></span></span>' +
        '<span class="dl-lid"><span class="dl-tape"></span></span>';
      carton.addEventListener("click", () => {
        play("box");
        carton.classList.add("opening");
        carton.disabled = true;
        window.setTimeout(showCheck, 1300);
      });
      this.overlay.body.replaceChildren(el("div", "case-speech", tx(S.boxSpeech)), carton, el("p", "dl-hint", tx(S.tapBox)));
      footer();
    };

    // ---------- 2. check against the invoice ----------
    let note: HTMLElement | null = null;
    const showCheck = () => {
      const paper = el("div", "dl-invoice");
      const head = el("div", "dl-invoice-head");
      head.append(el("strong", "", `🧾 ${tx(S.invoice)} #${1000 + (seed % 900)}`), el("span", "", tx(S.invoiceNo)));
      const list = el("ul");
      for (const line of invoice) {
        const li = el("li");
        li.append(el("span", "", tx(line.supply.name)), el("span", "dl-qty", `× ${line.qty}`));
        list.append(li);
      }
      paper.append(head, list);

      const items = el("div", "dl-items");
      box.forEach((line, i) => {
        const card = el("div", `dl-item ${line.state}`);
        const pic = el("span", "dl-pic");
        pic.innerHTML = icon(line.supply.icon);
        const info = el("div", "dl-info");
        info.append(el("strong", "", tx(line.supply.name)), el("span", "", `${tx(S.qty)}: ${line.qty} · Exp ${line.exp}`));
        if (line.problem === "damaged") info.append(el("span", "dl-flag", `⚠ ${tx(PROBLEMS.damaged.tag)}`));
        card.append(pic, info);
        if (line.problem === "damaged") card.classList.add("crushed");
        if (line.state === "open") {
          const buttons = el("div", "dl-choice");
          const yes = el("button", "dl-accept", `✓ ${tx(S.accept)}`);
          const no = el("button", "dl-return", `↩ ${tx(S.ret)}`);
          yes.addEventListener("click", () => judge(i, "accepted"));
          no.addEventListener("click", () => judge(i, "returned"));
          buttons.append(yes, no);
          card.append(buttons);
        } else {
          card.append(el("span", "dl-stamp", line.state === "accepted" ? `✓ ${tx(S.accepted)}` : `↩ ${tx(S.returned)}`));
        }
        items.append(card);
      });

      const checked = box.filter((l) => l.state !== "open").length;
      const count = el("div", "dl-count", tx(S.sorted).replace("{n}", String(checked)).replace("{total}", String(box.length)));
      // the hint goes above the items so it is on screen right after a tap (no scrolling)
      const parts: HTMLElement[] = [el("div", "case-speech", tx(S.checkSpeech)), paper, count];
      if (note) parts.push(note);
      parts.push(items);
      this.overlay.body.replaceChildren(...parts);
      footer();
    };

    const judge = (i: number, choice: "accepted" | "returned") => {
      const line = box[i];
      const right = (choice === "returned") === !!line.problem;
      if (right) {
        line.state = choice;
        note = null;
      } else {
        note = feedback(line.problem ? tx(PROBLEMS[line.problem].why) : tx(S.goodHint), "bad");
      }
      if (box.every((l) => l.state !== "open")) return showSign();
      showCheck();
    };

    // ---------- 3. sign the delivery note ----------
    const showSign = () => {
      const summary = el("div", "dl-summary");
      const kept = box.filter((l) => l.state === "accepted");
      const back = box.filter((l) => l.state === "returned");
      summary.append(
        el("div", "dl-sum-row good", `✓ ${tx(S.received)}: ${kept.map((l) => tx(l.supply.name)).join(", ")}`),
        el("div", "dl-sum-row back", `↩ ${tx(S.returning)}: ${back.map((l) => `${tx(l.supply.name)} (${tx(PROBLEMS[l.problem!].tag)})`).join(", ")}`)
      );

      const pad = el("div", "dl-sign");
      const canvas = el("canvas");
      canvas.width = 560;
      canvas.height = 180;
      const placeholder = el("span", "dl-sign-hint", `✍️ ${tx(S.signHere)}`);
      const clear = el("button", "link-btn dl-clear", tx(S.clear));
      pad.append(canvas, placeholder, el("span", "dl-sign-line"), clear);

      const confirm = el("button", "primary-btn", tx(S.confirm));
      confirm.disabled = true;
      let ink = 0;
      let pointer: number | null = null;
      let lastTime = 0;
      let last: { x: number; y: number } | null = null;
      const pen = createPenSound();
      const ctx = canvas.getContext("2d")!;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#1b3d8f";
      const point = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        return { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
      };
      canvas.addEventListener("pointerdown", (e) => {
        if (pointer !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
        pointer = e.pointerId;
        canvas.setPointerCapture(e.pointerId);
        last = point(e);
        lastTime = e.timeStamp;
        placeholder.classList.add("hidden");
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!last || pointer !== e.pointerId) return;
        const p = point(e);
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        const distance = Math.hypot(p.x - last.x, p.y - last.y);
        pen.move(distance / canvas.width / (Math.max(8, e.timeStamp - lastTime) / 1000));
        ink += distance;
        last = p;
        lastTime = e.timeStamp;
        confirm.disabled = ink < 120; // a real squiggle, not a single tap
      });
      const lift = () => { last = null; pointer = null; pen.stop(); };
      const release = (e: PointerEvent) => { if (pointer === e.pointerId) lift(); };
      canvas.addEventListener("pointerup", release);
      canvas.addEventListener("pointercancel", release);
      canvas.addEventListener("lostpointercapture", release);
      const suspend = () => { if (document.hidden) lift(); };
      window.addEventListener("blur", lift);
      document.addEventListener("visibilitychange", suspend);
      this.stopSignature = () => {
        lift();
        pen.destroy();
        window.removeEventListener("blur", lift);
        document.removeEventListener("visibilitychange", suspend);
      };
      clear.addEventListener("click", () => {
        lift();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ink = 0;
        confirm.disabled = true;
        placeholder.classList.remove("hidden");
      });
      confirm.addEventListener("click", () => {
        if (confirm.disabled) return;
        this.stopSignature();
        outcome = "resolved";
        const ok = el("button", "primary-btn wide", tx(S.done));
        ok.addEventListener("click", () => this.overlay.close());
        this.overlay.body.replaceChildren(el("div", "case-speech", tx(S.thanks)), feedback(`🚚 +${rewards.coins} 🪙  +${rewards.xp} XP`, "good"));
        this.overlay.footer.replaceChildren(ok);
      });

      this.overlay.body.replaceChildren(el("div", "case-speech", tx(S.signSpeech)), summary, pad);
      footer(confirm);
    };

    showBox();
    this.overlay.open(() => { this.stopSignature(); done(outcome); });
  }
}
