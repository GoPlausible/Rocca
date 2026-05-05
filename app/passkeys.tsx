import React, { useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import { useProvider } from '@/hooks/useProvider';
import { BackChip } from '@/components/BackChip';
import { EditLabelModal } from '@/components/EditLabelModal';
import { LabelAvatar } from '@/components/LabelAvatar';
import { labelsStore, setLabel } from '@/stores/labels';

interface PasskeyLike {
  id: string;
  name: string;
  algorithm: string;
  createdAt?: number;
  metadata?: Record<string, any>;
}

export default function PasskeysScreen() {
  const router = useRouter();
  const { passkeys, passkey: passkeyApi } = useProvider();
  const labels = useStore(labelsStore, (s) => s.byKey);

  const openRowRef = useRef<Swipeable | null>(null);
  const [editTarget, setEditTarget] = useState<PasskeyLike | null>(null);

  const labelFor = (id: string) => labels[`passkeys:${id}`];

  const handleDelete = (passkey: PasskeyLike) => {
    const lbl = labelFor(passkey.id);
    const display = lbl?.name ?? passkey.name;
    Alert.alert('Delete passkey', `Delete "${display}"? This cannot be undone.`, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => openRowRef.current?.close(),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          openRowRef.current?.close();
          openRowRef.current = null;
          try {
            await passkeyApi.store.removePasskey(passkey.id);
          } catch (err) {
            console.error('Failed to remove passkey:', err);
            Alert.alert('Error', 'Failed to remove passkey');
          }
        },
      },
    ]);
  };

  const renderRightActions = (passkey: PasskeyLike) => () => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(passkey)}>
      <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const handleEdit = (passkey: PasskeyLike) => {
    openRowRef.current?.close();
    openRowRef.current = null;
    setEditTarget(passkey);
  };

  const renderLeftActions = (passkey: PasskeyLike) => () => (
    <TouchableOpacity style={styles.editAction} onPress={() => handleEdit(passkey)}>
      <MaterialIcons name="edit" size={24} color="#FFFFFF" />
      <Text style={styles.editText}>Edit</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Passkeys',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Passkeys</Text>
          <Text style={styles.hint}>Swipe right to edit, swipe left to delete.</Text>
          <View style={styles.list}>
            {passkeys.map((passkey, index) => {
              const lbl = labelFor(passkey.id);
              const displayName = lbl?.name ?? passkey.name;
              return (
                <Swipeable
                  key={`${passkey.id}:${index}`}
                  renderRightActions={renderRightActions(passkey)}
                  renderLeftActions={renderLeftActions(passkey)}
                  onSwipeableWillOpen={(_dir, swipeable) => {
                    if (openRowRef.current && openRowRef.current !== swipeable) {
                      try {
                        openRowRef.current.close();
                      } catch {
                        /* ignore */
                      }
                    }
                  }}
                  onSwipeableOpen={(_dir, swipeable) => {
                    openRowRef.current = swipeable;
                  }}
                  onSwipeableClose={() => {
                    openRowRef.current = null;
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.card}
                    onPress={() =>
                      router.push({
                        pathname: '/passkey-details',
                        params: { id: passkey.id },
                      })
                    }
                  >
                    <View style={styles.iconContainer}>
                      {lbl?.avatar ? (
                        <LabelAvatar avatar={lbl.avatar} emojiSize={24} />
                      ) : (
                        <MaterialIcons name="fingerprint" size={24} color="#10B981" />
                      )}
                    </View>
                    <View style={styles.details}>
                      <Text style={styles.passkeyName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      <Text
                        style={styles.credentialId}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        ID: {passkey.id}
                      </Text>
                      {passkey.metadata?.origin && (
                        <Text style={styles.origin} numberOfLines={1}>
                          Origin: {passkey.metadata.origin}
                        </Text>
                      )}
                      <Text style={styles.date}>
                        Created:{' '}
                        {passkey.createdAt
                          ? new Date(passkey.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                  </TouchableOpacity>
                </Swipeable>
              );
            })}
            {passkeys.length === 0 && <Text style={styles.emptyText}>No passkeys found</Text>}
          </View>
        </View>
      </ScrollView>

      <EditLabelModal
        visible={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit passkey"
        fallbackName={editTarget?.name ?? ''}
        initialName={editTarget ? labelFor(editTarget.id)?.name ?? '' : ''}
        initialAvatar={editTarget ? labelFor(editTarget.id)?.avatar ?? null : null}
        avatarPickerTitle="Pick passkey avatar"
        onSave={({ name, avatar }) => {
          if (editTarget) setLabel('passkeys', editTarget.id, { name, avatar: avatar ?? undefined });
          setEditTarget(null);
        }}
      />
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
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  iconEmoji: {
    fontSize: 24,
  },
  details: {
    flex: 1,
  },
  passkeyName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  credentialId: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 2,
  },
  origin: {
    fontSize: 13,
    color: '#3B82F6',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
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
});
