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
import { PrimaryBadge } from '@/components/PrimaryBadge';
import { LabelAvatar } from '@/components/LabelAvatar';
import { labelsStore, setLabel } from '@/stores/labels';
import { isPrimaryIdentity } from '@/lib/primary-key';

interface IdentityLike {
  address: string;
  did?: string;
  type: string;
  metadata?: Record<string, any>;
}

export default function IdentitiesScreen() {
  const router = useRouter();
  const { identities, identity: identityApi, keys } = useProvider();
  const labels = useStore(labelsStore, (s) => s.byKey);

  const openRowRef = useRef<Swipeable | null>(null);
  const [editTarget, setEditTarget] = useState<IdentityLike | null>(null);

  // Use `did` as the canonical key when available, falling back to `address`.
  const labelKeyOf = (i: IdentityLike): string => i.did ?? i.address;
  const labelFor = (i: IdentityLike) => labels[`identities:${labelKeyOf(i)}`];

  const handleDelete = (identity: IdentityLike) => {
    const lbl = labelFor(identity);
    const display = lbl?.name ?? identity.did ?? identity.address;
    Alert.alert(
      'Remove identity',
      `Remove "${display}" from this device? The DID is unaffected, but on-device records will be cleared.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => openRowRef.current?.close(),
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            openRowRef.current?.close();
            openRowRef.current = null;
            try {
              await identityApi.store.removeIdentity(identity.address);
            } catch (err) {
              console.error('Failed to remove identity:', err);
              Alert.alert('Error', 'Failed to remove identity');
            }
          },
        },
      ],
    );
  };

  const renderRightActions = (identity: IdentityLike) => () => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(identity)}>
      <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
      <Text style={styles.deleteText}>Remove</Text>
    </TouchableOpacity>
  );

  const handleEdit = (identity: IdentityLike) => {
    openRowRef.current?.close();
    openRowRef.current = null;
    setEditTarget(identity);
  };

  const renderLeftActions = (identity: IdentityLike) => () => (
    <TouchableOpacity style={styles.editAction} onPress={() => handleEdit(identity)}>
      <MaterialIcons name="edit" size={24} color="#FFFFFF" />
      <Text style={styles.editText}>Edit</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Identities',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Identities (DIDs)</Text>
          <Text style={styles.hint}>Swipe right to edit, swipe left to remove.</Text>
          <View style={styles.list}>
            {identities.map((identity, index) => {
              const lbl = labelFor(identity);
              const isPrimary = isPrimaryIdentity(identity, keys as any);
              return (
                <Swipeable
                  key={`${identity.did ?? identity.address}:${index}`}
                  renderRightActions={isPrimary ? undefined : renderRightActions(identity)}
                  renderLeftActions={renderLeftActions(identity)}
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
                        pathname: '/identity-details',
                        params: { did: identity.did ?? identity.address },
                      })
                    }
                  >
                    <View style={styles.iconContainer}>
                      {lbl?.avatar ? (
                        <LabelAvatar avatar={lbl.avatar} emojiSize={24} />
                      ) : (
                        <MaterialIcons name="person" size={24} color="#EF4444" />
                      )}
                    </View>
                    <View style={styles.details}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[styles.did, { flex: 1 }]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {lbl?.name ?? identity.did ?? identity.address}
                        </Text>
                        {isPrimary ? <PrimaryBadge variant="compact" /> : null}
                      </View>
                      {lbl?.name ? (
                        <Text style={styles.subDid} numberOfLines={1} ellipsizeMode="middle">
                          {identity.did ?? identity.address}
                        </Text>
                      ) : null}
                      {identity.type ? (
                        <Text style={styles.subtitle}>{identity.type}</Text>
                      ) : null}
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                  </TouchableOpacity>
                </Swipeable>
              );
            })}
            {identities.length === 0 && <Text style={styles.emptyText}>No identities found</Text>}
          </View>
        </View>
      </ScrollView>

      <EditLabelModal
        visible={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit identity"
        fallbackName={editTarget?.did ?? editTarget?.address ?? ''}
        initialName={editTarget ? labelFor(editTarget)?.name ?? '' : ''}
        initialAvatar={editTarget ? labelFor(editTarget)?.avatar ?? null : null}
        avatarPickerTitle="Pick identity avatar"
        allowImageAvatar
        onSave={({ name, avatar }) => {
          if (editTarget) {
            setLabel('identities', labelKeyOf(editTarget), {
              name,
              avatar: avatar ?? undefined,
            });
          }
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
    backgroundColor: '#FDF2F2',
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  did: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  subDid: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
});
