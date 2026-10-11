import type { StaffCard } from "../data/staff";
import { getRoomById } from "../data/rooms";

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Round ✕ button pinned to the top-right corner of the card it sits next to. */
export function cardCloseButton(onClose: () => void): HTMLButtonElement {
  const btn = el("button", "card-close", "✕");
  btn.setAttribute("aria-label", "Close");
  btn.addEventListener("click", onClose);
  return btn;
}

export interface IdCardOptions {
  /** "you" on the player's own profile, "off" for the doctor not being played. */
  badge?: "you" | "off";
}

/**
 * A staff ID card (lanyard, header, photo, role, what they help with...). Used by the staff
 * directory and the player's own profile.
 */
export function renderIdCard(card: StaffCard, opts: IdCardOptions = {}): HTMLDivElement {
  const root = el("div", "id-card");
  root.style.setProperty("--accent", card.accent);

  // lanyard + clip
  root.append(el("span", "id-lanyard"), el("span", "id-clip"));

  const head = el("div", "id-head");
  const logo = el("span", "id-logo", "✚");
  const org = el("div", "id-org");
  org.append(el("span", "", "Eczema Care Clinic"), el("strong", "", "Staff ID"));
  head.append(logo, org);

  const photo = el("div", "id-photo");
  const portrait = el("img", "id-portrait");
  portrait.src = card.portrait;
  portrait.alt = card.name;
  portrait.draggable = false;
  photo.appendChild(portrait);
  if (opts.badge === "you") photo.appendChild(el("span", "id-badge you", "You"));
  if (opts.badge === "off") photo.appendChild(el("span", "id-badge off", "Off duty today"));

  const name = el("h3", "id-name", card.name);
  const role = el("span", "id-role", card.role);

  const meta = el("div", "id-meta");
  const room = getRoomById(card.room);
  meta.append(el("span", "", `ID ${card.staffNo}`), el("span", "", `📍 ${room.label}`));

  const helpsTitle = el("div", "id-section", opts.badge === "you" ? "My role" : "Can help you with");
  const helps = el("ul", "id-helps");
  for (const h of card.helps) helps.appendChild(el("li", "", h));

  const aboutTitle = el("div", "id-section", "About me");
  const about = el("p", "id-about", `“${card.about}”`);

  const foot = el("div", "id-foot");
  foot.append(el("span", "id-barcode"), el("span", "id-valid", "Valid until 12/2027"));

  root.append(head, photo, name, role, meta, helpsTitle, helps, aboutTitle, about, foot);
  return root;
}
