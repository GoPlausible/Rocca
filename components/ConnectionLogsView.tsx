import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import { logsStore, clearLogs, getLogBytes, type LogEntry } from '@/stores/logs';

const LEVEL_STYLES = {
  error: { color: '#EF4444', bg: '#FEF2F2', icon: 'error-outline' as const },
  warn: { color: '#D97706', bg: '#FFFBEB', icon: 'warning-amber' as const },
  info: { color: '#3B82F6', bg: '#EFF6FF', icon: 'info-outline' as const },
};

export interface ConnectionLogsViewProps {
  origin: string;
  requestId: string;
}

/**
 * Body content that swaps in for the chat's messages list when the user
 * taps the status pill. Reads from the per-connection log store (5 MB
 * FIFO ring buffer) and renders newest-first with a level badge, code,
 * message and timestamp.
 *
 * Ships its own header? No — the wrapping chat screen owns the header
 * (back chip + title + clear-logs action). This component is body-only.
 */
export function ConnectionLogsView({
  origin,
  requestId,
}: ConnectionLogsViewProps): React.JSX.Element {
  const byKey = useStore(logsStore, (s) => s.byKey);
  const k = `${origin}:${requestId}`;
  const entries = useMemo(() => {
    const arr = byKey[k] ?? [];
    // Newest first.
    return [...arr].reverse();
  }, [byKey, k]);

  const totalBytes = useMemo(() => getLogBytes(origin, requestId), [byKey, origin, requestId]);
  const headerSubtitle = `${entries.length} entries · ${formatBytes(totalBytes)}`;

  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <MaterialIcons name="receipt-long" size={42} color="#CBD5E1" />
        <Text style={styles.emptyTitle}>No logs yet</Text>
        <Text style={styles.emptySubtitle}>
          The agent hasn't reported any status notices on this connection.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={entries}
      keyExtractor={(item, idx) => `${item.ts}-${idx}`}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View style={styles.statsRow}>
          <Text style={styles.stats}>{headerSubtitle}</Text>
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                'Clear logs',
                `Remove all ${entries.length} log entries for this connection?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => clearLogs(origin, requestId),
                  },
                ],
              )
            }
            hitSlop={10}
          >
            <Text style={styles.clearLink}>Clear</Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => <LogRow entry={item} />}
    />
  );
}

function LogRow({ entry }: { entry: LogEntry }) {
  const cfg = LEVEL_STYLES[entry.level];
  return (
    <View style={[styles.card, { backgroundColor: cfg.bg }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLevel}>
          <MaterialIcons name={cfg.icon} size={16} color={cfg.color} />
          <Text style={[styles.cardLevelText, { color: cfg.color }]}>
            {entry.level.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.cardTimestamp}>{formatTimestamp(entry.ts)}</Text>
      </View>
      <Text style={styles.cardCode}>{entry.code}</Text>
      <Text style={styles.cardMessage}>{entry.message}</Text>
      {entry.retryAfterMs !== undefined ? (
        <Text style={styles.cardMeta}>
          Retry after: {Math.round(entry.retryAfterMs / 1000)}s
        </Text>
      ) : null}
    </View>
  );
}

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  stats: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  clearLink: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLevel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardLevelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  cardCode: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  cardMessage: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
