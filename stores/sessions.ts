import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

export interface Session {
  id: string; // Typically the requestId
  origin: string;
  /** User-supplied display label, set via the rename action on Connections. */
  name?: string;
  /** Optional emoji avatar set per connection in the rename/edit modal. */
  avatar?: string;
  timestamp: number;
  status: 'active' | 'closed' | 'failed';
  lastActivity: number;
  ttl?: number;
}

export interface SessionsState {
  sessions: Session[];
}

const sessionsLocalStorage = createMMKV({
  id: 'sessions',
});

// Load initial state from storage
const loadInitialSessions = (): SessionsState => {
  try {
    const stored = sessionsLocalStorage.getString('sessions');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Filter out expired sessions on load
      const now = Date.now();
      const validSessions = parsed.filter((s: Session) => {
        if (!s.ttl) return true;
        return now - s.lastActivity < s.ttl;
      });
      return { sessions: validSessions };
    }
  } catch (error) {
    console.error('Failed to load sessions from storage:', error);
  }
  return { sessions: [] };
};

export const sessionsStore = new Store<SessionsState>(loadInitialSessions());

// Subscribe to store changes and save to storage
sessionsStore.subscribe(() => {
  const state = sessionsStore.state;
  try {
    sessionsLocalStorage.set('sessions', JSON.stringify(state.sessions));
  } catch (error) {
    console.error('Failed to save sessions to storage:', error);
  }
});

export function addSession(session: Omit<Session, 'timestamp' | 'lastActivity'>) {
  const now = Date.now();
  sessionsStore.setState((state) => {
    // Avoid duplicate sessions with the same id (requestId) and origin
    const filtered = state.sessions.filter(
      (s) => !(s.id === session.id && s.origin === session.origin),
    );
    return {
      ...state,
      sessions: [
        ...filtered,
        {
          ...session,
          timestamp: now,
          lastActivity: now,
        },
      ],
    };
  });
}

export function updateSessionStatus(id: string, origin: string, status: Session['status']) {
  sessionsStore.setState((state) => ({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id && s.origin === origin ? { ...s, status, lastActivity: Date.now() } : s,
    ),
  }));
}

export function updateSessionActivity(id: string, origin: string) {
  sessionsStore.setState((state) => ({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id && s.origin === origin ? { ...s, lastActivity: Date.now() } : s,
    ),
  }));
}

export function renameSession(id: string, origin: string, name: string) {
  const trimmed = name.trim();
  sessionsStore.setState((state) => ({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id && s.origin === origin
        ? { ...s, name: trimmed.length > 0 ? trimmed : undefined }
        : s,
    ),
  }));
}

export function setSessionAvatar(id: string, origin: string, avatar: string | null) {
  sessionsStore.setState((state) => ({
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === id && s.origin === origin
        ? { ...s, avatar: avatar ?? undefined }
        : s,
    ),
  }));
}

export function removeSession(id: string, origin: string) {
  sessionsStore.setState((state) => ({
    ...state,
    sessions: state.sessions.filter((s) => !(s.id === id && s.origin === origin)),
  }));
}

export function clearSessions() {
  sessionsStore.setState((state) => ({
    ...state,
    sessions: [],
  }));
}

/**
 * Expire any sessions that have a ttl and have expired based on lastActivity.
 */
export function expireSessions() {
  const now = Date.now();
  sessionsStore.setState((state) => {
    const validSessions = state.sessions.filter((s) => {
      if (!s.ttl) return true;
      return now - s.lastActivity < s.ttl;
    });

    if (validSessions.length === state.sessions.length) {
      return state;
    }

    return {
      ...state,
      sessions: validSessions,
    };
  });
}

// Periodically expire sessions every hour. Combined with the 7-day TTL set
// when a session is added, sessions are practically persistent across normal
// app use; the sweeper just GCs sessions truly abandoned for >7 days.
setInterval(expireSessions, 60 * 60 * 1000);
