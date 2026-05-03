import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import {
  activityStore,
  clearActivity,
  getActivityBytes,
  type ActivityEntry,
} from '@/stores/activity';
import { useProvider } from '@/hooks/useProvider';
import { BackChip } from '@/components/BackChip';

export default function ActivityScreen(): React.JSX.Element {
  const entries = useStore(activityStore, (s) =>
    [...s.entries].reverse() as ActivityEntry[],
  );
  const { sessions } = useProvider();

  const totalBytes = useMemo(() => getActivityBytes(), [entries]);
  const headerSubtitle = `${entries.length} entries · ${formatBytes(totalBytes)}`;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Activity',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="history" size={42} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No activity yet</Text>
          <Text style={styles.emptySubtitle}>
            Things you do across accounts, identities, passkeys and connections show up here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <Text style={styles.stats}>{headerSubtitle}</Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Clear activity',
                    `Remove all ${entries.length} activity entries?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: () => clearActivity(),
                      },
                    ],
                  )
                }
                hitSlop={10}
              >
                <Text style={styles.clearLink}>Clear All</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <ActivityRow entry={item} sessions={sessions} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

interface SessionLite {
  id: string;
  origin: string;
  name?: string;
}

function ActivityRow({
  entry,
  sessions,
}: {
  entry: ActivityEntry;
  sessions: ReadonlyArray<SessionLite>;
}) {
  const visual = activityVisualFor(entry.kind);
  const subtitle = resolveSubtitle(entry, sessions);
  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: visual.bg }]}>
        <MaterialIcons name={visual.icon} size={22} color={visual.color} />
      </View>
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {entry.title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1} ellipsizeMode="middle">
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.timestamp}>{new Date(entry.ts).toLocaleString()}</Text>
      </View>
    </View>
  );
}

type ActivityKind = ActivityEntry['kind'];

interface ActivityVisual {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
}

function activityVisualFor(kind: ActivityKind): ActivityVisual {
  switch (kind) {
    case 'app.unlocked':
      return { icon: 'lock-open', color: '#10B981', bg: '#ECFDF5' };
    case 'app.reset':
      return { icon: 'restart-alt', color: '#EF4444', bg: '#FEF2F2' };
    case 'account.added':
    case 'account.removed':
      return { icon: 'account-balance-wallet', color: '#3B82F6', bg: '#E1EFFF' };
    case 'identity.added':
    case 'identity.removed':
      return { icon: 'person', color: '#EF4444', bg: '#FDF2F2' };
    case 'passkey.added':
    case 'passkey.removed':
      return { icon: 'fingerprint', color: '#10B981', bg: '#ECFDF5' };
    case 'connection.paired':
    case 'connection.connected':
      return { icon: 'link', color: '#10B981', bg: '#ECFDF5' };
    case 'connection.disconnected':
    case 'connection.removed':
      return { icon: 'link-off', color: '#EF4444', bg: '#FEF2F2' };
    case 'signing.received':
      return { icon: 'edit', color: '#3B82F6', bg: '#E1EFFF' };
    case 'signing.approved':
      return { icon: 'check-circle', color: '#10B981', bg: '#ECFDF5' };
    case 'signing.rejected':
      return { icon: 'cancel', color: '#EF4444', bg: '#FEF2F2' };
    case 'vc.issued':
      return { icon: 'verified-user', color: '#D97706', bg: '#FEF3C7' };
    case 'vc.removed':
      return { icon: 'verified-user', color: '#94A3B8', bg: '#F1F5F9' };
    default:
      return { icon: 'history', color: '#64748B', bg: '#F1F5F9' };
  }
}

function resolveSubtitle(
  entry: ActivityEntry,
  sessions: ReadonlyArray<SessionLite>,
): string | undefined {
  if (!entry.kind.startsWith('connection.')) {
    return entry.subtitle;
  }
  const origin =
    typeof entry.meta?.origin === 'string'
      ? entry.meta.origin
      : entry.subtitle ?? '';
  const requestId =
    typeof entry.meta?.requestId === 'string' ? entry.meta.requestId : null;
  if (origin && requestId) {
    const matched = sessions.find(
      (s) => s.origin === origin && s.id === requestId,
    );
    const name = matched?.name?.trim();
    if (name) return name;
  }
  return entry.subtitle ?? origin;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  list: { padding: 16, gap: 8 },
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  details: { flex: 1 },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
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
