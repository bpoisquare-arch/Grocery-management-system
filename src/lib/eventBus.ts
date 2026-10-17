import { EventEmitter } from 'events';

// Global singleton event bus across the Node process for real-time live events
declare global {
  // eslint-disable-next-line no-var
  var globalEventEmitter: EventEmitter | undefined;
}

if (!globalThis.globalEventEmitter) {
  globalThis.globalEventEmitter = new EventEmitter();
  globalThis.globalEventEmitter.setMaxListeners(200);
}

export const eventBus = globalThis.globalEventEmitter;
