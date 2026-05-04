export interface PendingConfirmation {
  type: "begin" | "remove" | "adminreset";
  payload: unknown;
  timeout: ReturnType<typeof setTimeout>;
}

const pendingConfirmations = new Map<string, PendingConfirmation>();

const TIMEOUT_MS = 60_000;

function key(userId: string, channelId: string, action: string): string {
  return `${userId}:${channelId}:${action}`;
}

export function add(
  userId: string,
  channelId: string,
  action: "begin" | "remove" | "adminreset",
  payload: unknown
): void {
  const k = key(userId, channelId, action);
  // Clear any existing entry for this key
  const existing = pendingConfirmations.get(k);
  if (existing) {
    clearTimeout(existing.timeout);
  }

  const timeout = setTimeout(() => {
    pendingConfirmations.delete(k);
  }, TIMEOUT_MS);

  pendingConfirmations.set(k, { type: action, payload, timeout });
}

export function check(
  userId: string,
  channelId: string,
  action: "begin" | "remove" | "adminreset"
): PendingConfirmation | undefined {
  const k = key(userId, channelId, action);
  const entry = pendingConfirmations.get(k);
  if (!entry) return undefined;

  clearTimeout(entry.timeout);
  pendingConfirmations.delete(k);
  return entry;
}
