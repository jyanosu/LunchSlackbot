import { App } from "@slack/bolt";

let boltApp: App | null = null;

export function setBoltApp(app: App): void {
  boltApp = app;
}

export function getClient(): any {
  return boltApp?.client ?? null;
}
