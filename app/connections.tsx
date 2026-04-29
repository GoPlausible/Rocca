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
import { removeSession, renameSession, type Session } from '@/stores/sessions';

export default function ConnectionsScreen() {
  const router = useRouter();
  const { sessions } = useProvider();

  // Track open swipeable rows so we can close any previously-open one when
  // a new row is swiped open.
  const openRowRef = useRef<Swipeable | null>(null);

  const [renameTarget, setRenameTarget] = useState<Session | null>(null);
  const [renameInput, setRenameInput] = useState('');

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
    setRenameTarget(null);
    setRenameInput('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Connections',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ),
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
                    <MaterialIcons name="link" size={24} color="#64748B" />
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
        title="Rename connection"
      >
        <View style={styles.renameBody}>
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
    </SafeAreaView>
  );
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
