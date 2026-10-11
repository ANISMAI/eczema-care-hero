// Tiny typed event bus used to decouple the DOM-based HUD/modals from the Phaser scene.
type Listener = (...args: any[]) => void;

class EventBus {
  private listeners = new Map<string, Set<Listener>>();

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((l) => l(...args));
  }
}

export const eventBus = new EventBus();
