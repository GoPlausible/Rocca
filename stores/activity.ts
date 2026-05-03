import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * App-wide activity log. Persists every notable user/system event so the
 * landing's "Recent Activity" section reflects real history instead of a
 * placeholder, and so users can scroll through what's happened across
 * accounts, identities, passkeys, and connections.
 *
 * Distinct from the per-connection logs store (`stores/logs.ts`), which
 * captures notice-flow diagnostics scoped to a single chat. Activity is
 * cross-cutting; logs are connection-local.
 */

export type ActivityKind =
  | 'app.unlocked'
  | 'app.reset'
  | 'account.added'
  | 'account.removed'
  | 'identity.added'
  | 'identity.removed'
  | 'passkey.added'
  | 'passkey.removed'
  | 'connection.paired'
  | 'connection.connected'
  | 'connection.disconnected'
  | 'connection.removed'
  | 'signing.received'
  | 'signing.approved'
  | 'signing.rejected'
  | 'vc.issued'
  | 'vc.removed';

export interface ActivityEntry {
  /** Stable id for keyExtractor / dedup. */
  id: string;
  ts: number;
  kind: ActivityKind;
  /** Short headline shown in lists ("Account paired", "Signed payment"). */
  title: string;
  /** Optional secondary line (truncated origin, address suffix, etc.). */
  subtitle?: string;
  /** Optional structured data for detail views — kept small. */
  meta?: Record<string, string | number | boolean | null>;
}

export interface ActivityState {
  entries: ActivityEntry[];
}

const STORAGE_KEY = 'activity';
const storage = createMMKV({ id: 'activity' });

/** Hard cap on stored entries (FIFO drop). 500 covers ~weeks of normal use. */
const MAX_ENTRIES = 500;

const loadInitial = (): ActivityState => {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ActivityState>;
      if (Array.isArray(parsed.entries)) {
        return { entries: parsed.entries as ActivityEntry[] };
      }
    }
  } catch (err) {
    console.error('Failed to load activity:', err);
  }
  return { entries: [] };
};

export const activityStore = new Store<ActivityState>(loadInitial());

activityStore.subscribe(() => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(activityStore.state));
  } catch (err) {
    console.error('Failed to save activity:', err);
  }
});

/**
 * Append an activity entry. `id` and `ts` are auto-set from now if absent.
 * Trims to MAX_ENTRIES with FIFO drop.
 */
export function appendActivity(
  entry: Omit<ActivityEntry, 'id' | 'ts'> & Partial<Pick<ActivityEntry, 'id' | 'ts'>>,
): void {
  const ts = entry.ts ?? Date.now();
  const id = entry.id ?? `act-${ts}-${Math.random().toString(36).slice(2, 8)}`;
  const next: ActivityEntry = { ...entry, id, ts };
  activityStore.setState((s) => {
    const all = [...s.entries, next];
    const trimmed = all.length > MAX_ENTRIES ? all.slice(all.length - MAX_ENTRIES) : all;
    return { entries: trimmed };
  });
}

export function clearActivity(): void {
  activityStore.setState(() => ({ entries: [] }));
}
