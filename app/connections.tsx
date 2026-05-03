import React, { useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useProvider } from '@/hooks/useProvider';
import { Modal } from '@/components/Modal';
import { EmojiPickerModal } from '@/components/EmojiPickerModal';
import { BackChip } from '@/components/BackChip';
import { useStore } from '@tanstack/react-store';
import { messagesStore } from '@/stores/messages';
import {
  removeSession,
  renameSession,
  setSessionAvatar,
  type Session,
} from '@/stores/sessions';

export default function ConnectionsScreen() {
  const router = useRouter();
  const { sessions } = useProvider();
  // Aggregated message counts per session (origin + requestId). Indexed
  // here at render time to avoid wiring counters into the messages store
  // itself — cost is one O(N) pass per render of this screen.
  const messageCountsByKey = useStore(messagesStore, (state) => {
    const counts: Record<string, number> = {};
    for (const m of state.messages) {
      const k = `${m.origin}:${m.requestId}`;
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  });

  // Track open swipeable rows so we can close any previously-open one when
  // a new row is swiped open.
  const openRowRef = useRef<Swipeable | null>(null);

  const [renameTarget, setRenameTarget] = useState<Session | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameAvatar, setRenameAvatar] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const handleDelete = (session: Session) => {
    Alert.alert(
      'Remove connection',
      `Remove the connection to ${session.origin}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => openRowRef.current?.close(),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            openRowRef.current?.close();
            openRowRef.current = null;
            removeSession(session.id, session.origin);
          },
        },
      ],
    );
  };

  const renderRightActions = (session: Session) => () => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(session)}>
      <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
      <Text style={styles.deleteText}>Remove</Text>
    </TouchableOpacity>
  );

  const handleEdit = (session: Session) => {
    openRowRef.current?.close();
    openRowRef.current = null;
    setRenameInput(session.name ?? '');
    setRenameAvatar(session.avatar ?? null);
    setRenameTarget(session);
  };

  const renderLeftActions = (session: Session) => () => (
    <TouchableOpacity style={styles.editAction} onPress={() => handleEdit(session)}>
      <MaterialIcons name="edit" size={24} color="#FFFFFF" />
      <Text style={styles.editText}>Edit</Text>
    </TouchableOpacity>
  );

  const handleSaveRename = () => {
    if (!renameTarget) return;
    renameSession(renameTarget.id, renameTarget.origin, renameInput);
    setSessionAvatar(renameTarget.id, renameTarget.origin, renameAvatar);
    setRenameTarget(null);
    setRenameInput('');
    setRenameAvatar(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Connections',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Connections</Text>
          <Text style={styles.hint}>
            Swipe right to rename, swipe left to remove.
          </Text>
          <View style={styles.list}>
            {sessions.map((session, index) => (
              <Swipeable
                key={`${session.origin}:${session.id}:${index}`}
                renderRightActions={renderRightActions(session)}
                renderLeftActions={renderLeftActions(session)}
                onSwipeableWillOpen={(_direction, swipeable) => {
                  // Close any previously-open row before opening this one.
                  if (openRowRef.current && openRowRef.current !== swipeable) {
                    try {
                      openRowRef.current.close();
                    } catch {
                      // ignore
                    }
                  }
                }}
                onSwipeableOpen={(_direction, swipeable) => {
                  openRowRef.current = swipeable;
                }}
                onSwipeableClose={() => {
                  openRowRef.current = null;
                }}
              >
                <TouchableOpacity
                  style={styles.card}
                  onPress={() =>
                    router.push({
                      pathname: '/chat',
                      params: { origin: session.origin, requestId: session.id },
                    })
                  }
                >
                  <View style={styles.iconContainer}>
                    {session.avatar ? (
                      <Text style={styles.iconEmoji}>{session.avatar}</Text>
                    ) : (
                      <MaterialIcons name="link" size={24} color="#64748B" />
                    )}
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.origin} numberOfLines={1}>
                      {session.name?.trim() ? session.name : session.origin}
                    </Text>
                    {session.name?.trim() ? (
                      <Text style={styles.subOrigin} numberOfLines={1}>
                        {session.origin}
                      </Text>
                    ) : null}
                    <Text style={styles.metaLine}>
                      {(messageCountsByKey[`${session.origin}:${session.id}`] ?? 0)} message
                      {(messageCountsByKey[`${session.origin}:${session.id}`] ?? 0) === 1
                        ? ''
                        : 's'}
                      {' · last active '}
                      {formatLastActive(session.lastActivity)}
                    </Text>
                    <Text style={styles.status}>Active</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity>
              </Swipeable>
            ))}
            {sessions.length === 0 && (
              <Text style={styles.emptyText}>No active connections found</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Edit connection"
      >
        <View style={styles.renameBody}>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarPickerCircle}
              onPress={() => setEmojiPickerOpen(true)}
              activeOpacity={0.8}
            >
              {renameAvatar ? (
                <Text style={styles.avatarPickerEmoji}>{renameAvatar}</Text>
              ) : (
                <MaterialIcons name="emoji-emotions" size={28} color="#64748B" />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.renameLabel}>Avatar</Text>
              <Text style={styles.renameHint}>
                Tap the circle to pick an emoji.
              </Text>
            </View>
          </View>

          <Text style={styles.renameLabel}>Name</Text>
          <TextInput
            style={styles.renameInput}
            value={renameInput}
            onChangeText={setRenameInput}
            placeholder={renameTarget?.origin ?? ''}
            placeholderTextColor="#94A3B8"
            autoFocus
            maxLength={64}
          />
          <Text style={styles.renameHint}>
            Leave empty to clear the custom name and show the origin.
          </Text>
          <View style={styles.renameActions}>
            <TouchableOpacity
              style={[styles.renameButton, styles.renameCancel]}
              onPress={() => setRenameTarget(null)}
            >
              <Text style={styles.renameCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.renameButton, styles.renameSave]}
              onPress={handleSaveRename}
            >
              <Text style={styles.renameSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <EmojiPickerModal
        visible={emojiPickerOpen}
        initial={renameAvatar}
        title="Pick connection avatar"
        onClose={() => setEmojiPickerOpen(false)}
        onSelect={(emoji) => setRenameAvatar(emoji)}
      />
    </SafeAreaView>
  );
}

function formatLastActive(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return `${Math.floor(diff / 86400_000)}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 12,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  origin: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  status: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
  },
  metaLine: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 96,
    borderRadius: 20,
    marginLeft: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 4,
    fontSize: 12,
  },
  editAction: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    width: 96,
    borderRadius: 20,
    marginRight: 8,
  },
  editText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 4,
    fontSize: 12,
  },
  subOrigin: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  renameBody: {
    gap: 12,
    paddingVertical: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  avatarPickerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarPickerEmoji: {
    fontSize: 32,
  },
  iconEmoji: {
    fontSize: 24,
  },
  renameLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  renameInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  renameHint: {
    fontSize: 12,
    color: '#94A3B8',
  },
  renameActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  renameButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  renameCancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  renameCancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  renameSave: {
    backgroundColor: '#3B82F6',
  },
  renameSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
