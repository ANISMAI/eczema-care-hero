/**
 * Full-screen soft fade with a centred icon and line of text, used for private moments
 * (toilet, prayer) so nothing inside is shown. `show` resolves when the fade is over.
 */
export default class Fader {
  private root: HTMLDivElement;
  private icon: HTMLDivElement;
  private text: HTMLDivElement;
  private extra: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "fader";
    this.icon = document.createElement("div");
    this.icon.className = "fader-icon";
    this.extra = document.createElement("div");
    this.extra.className = "fader-extra";
    this.text = document.createElement("div");
    this.text.className = "fader-text";
    this.root.append(this.icon, this.extra, this.text);
    parent.appendChild(this.root);
  }

  /**
   * `art`: optional element shown above the text. `caption`: no dark screen, only a soft
   * caption bar, so the scene stays visible (e.g. the doctor praying on the mat).
   */
  show(icon: string, text: string, ms: number, art?: HTMLElement, caption = false, spin = false): Promise<void> {
    this.root.classList.toggle("caption", caption);
    this.icon.classList.toggle("spin", spin);
    this.icon.textContent = icon;
    this.text.textContent = text;
    this.extra.replaceChildren(...(art ? [art] : []));
    this.root.classList.add("show");
    return new Promise((resolve) =>
      window.setTimeout(() => {
        this.root.classList.remove("show");
        window.setTimeout(resolve, 350);
      }, ms)
    );
  }

  /** Swap the text while showing (e.g. "Feeling refreshed"). */
  setText(icon: string, text: string): void {
    this.icon.textContent = icon;
    this.text.textContent = text;
  }
}
