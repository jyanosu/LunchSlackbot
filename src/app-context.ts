import type { App } from "@slack/bolt";

let boltApp: App | null = null;

export function setBoltApp(app: App | null): void {
  boltApp = app;
}

export function getBoltApp(): App | null {
  return boltApp;
}

export function getClient(): any {
  return boltApp?.client ?? null;
}
