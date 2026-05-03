import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * Per-connection diagnostic log. Backed by MMKV so each `(origin,
 * requestId)` keeps its own ring buffer of `ac2/Notice` payloads (and any
 * future client-side trace lines we add).
 *
 * Hard cap at `MAX_BYTES_PER_CONNECTION` of JSON-serialized entries per
 * connection — when exceeded, the oldest entries are dropped FIFO until
 * the cap is satisfied. Caller never has to manage size.
 *
 * Layered separately from the source-of-truth notification streams so a
 * `forget` on the connection still leaves the logs explorable; explicit
 * `clearLogs(connKey)` removes them.
 */

export type LogLevel = 'error' | 'warn' | 'info';

export interface LogEntry {
  /** Wall-clock millis at which this entry was appended. */
  ts: number;
  level: LogLevel;
  /** Dot-separated namespaced code from the agent (e.g. `model.timeout`). */
  code: string;
  message: string;
  /** Optional advisory from the agent — e.g. cooldown after rate limiting. */
  retryAfterMs?: number;
}

export interface LogsState {
  /** Keyed by `${origin}:${requestId}`. */
  byKey: Record<string, LogEntry[]>;
}

const STORAGE_KEY = 'logs';
const MAX_BYTES_PER_CONNECTION = 5 * 1024 * 1024; // 5 MB
const storage = createMMKV({ id: 'logs' });

const connKey = (origin: string, requestId: string): string =>
  `${origin}:${requestId}`;

const loadInitial = (): LogsState => {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LogsState>;
      if (parsed && typeof parsed.byKey === 'object' && parsed.byKey !== null) {
        return { byKey: parsed.byKey as Record<string, LogEntry[]> };
      }
    }
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
  return { byKey: {} };
};

export const logsStore = new Store<LogsState>(loadInitial());

logsStore.subscribe(() => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(logsStore.state));
  } catch (err) {
    console.error('Failed to save logs:', err);
  }
});

/**
 * Cheap byte estimate — `JSON.stringify(entries).length` is the same byte
 * count we'd persist to MMKV (UTF-8 single-byte for ASCII; multi-byte for
 * non-ASCII). Slight under-count for emojis; close enough for capping.
 */
function bytesOf(entries: LogEntry[]): number {
  return JSON.stringify(entries).length;
}

/** Drop oldest entries until total bytes <= MAX_BYTES_PER_CONNECTION. */
function rotate(entries: LogEntry[]): LogEntry[] {
  let arr = entries;
  while (arr.length > 1 && bytesOf(arr) > MAX_BYTES_PER_CONNECTION) {
    arr = arr.slice(Math.max(1, Math.floor(arr.length * 0.1))); // drop 10% per pass
  }
  return arr;
}

export function appendLog(
  origin: string,
  requestId: string,
  entry: LogEntry,
): void {
  if (!origin || !requestId) return;
  const k = connKey(origin, requestId);
  logsStore.setState((s) => {
    const existing = s.byKey[k] ?? [];
    const next = rotate([...existing, entry]);
    return { byKey: { ...s.byKey, [k]: next } };
  });
}

export function getLogs(origin: string, requestId: string): LogEntry[] {
  if (!origin || !requestId) return [];
  return logsStore.state.byKey[connKey(origin, requestId)] ?? [];
}

export function clearLogs(origin: string, requestId: string): void {
  if (!origin || !requestId) return;
  const k = connKey(origin, requestId);
  logsStore.setState((s) => {
    const byKey = { ...s.byKey };
    delete byKey[k];
    return { byKey };
  });
}

/** For diagnostics — total bytes used by a connection's log. */
export function getLogBytes(origin: string, requestId: string): number {
  return bytesOf(getLogs(origin, requestId));
}
