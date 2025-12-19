/**
 * Minimal in-memory auth event bus.
 *
 * Why: expo-router navigation can be flaky when switching between nested groups.
 * We need a deterministic way to tell the Tabs layout "auth state changed, re-check now".
 *
 * No secrets/PII are stored or emitted here.
 */

export type AuthEvent = 'loggedOut' | 'loggedIn';

type Listener = (event: AuthEvent) => void;

const listeners = new Set<Listener>();

export function emitAuthEvent(event: AuthEvent) {
  for (const listener of listeners) {
    try {
      listener(event);
    } catch {
      // ignore
    }
  }
}

export function onAuthEvent(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}


