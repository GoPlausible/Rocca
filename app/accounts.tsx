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
import { labelsStore, setLabel } from '@/stores/labels';
import { isPrimaryAccount } from '@/lib/primary-key';

interface AccountLike {
  address: string;
  balance: bigint | number | string;
  metadata?: Record<string, any>;
}

export default function AccountsScreen() {
  const router = useRouter();
  const { accounts, account: accountApi, keys } = useProvider();
  const labels = useStore(labelsStore, (s) => s.byKey);

  const openRowRef = useRef<Swipeable | null>(null);
  const [editTarget, setEditTarget] = useState<AccountLike | null>(null);

  const labelFor = (address: string) => labels[`accounts:${address}`];

  const handleDelete = (account: AccountLike) => {
    const lbl = labelFor(account.address);
    const display = lbl?.name ?? account.address;
    Alert.alert(
      'Remove account',
      `Remove "${display}" from this device? The on-chain account is unaffected.`,
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
              await accountApi.store.removeAccount(account.address);
            } catch (err) {
              console.error('Failed to remove account:', err);
              Alert.alert('Error', 'Failed to remove account');
            }
          },
        },
      ],
    );
  };

  const renderRightActions = (account: AccountLike) => () => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(account)}>
      <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
      <Text style={styles.deleteText}>Remove</Text>
    </TouchableOpacity>
  );

  const handleEdit = (account: AccountLike) => {
    openRowRef.current?.close();
    openRowRef.current = null;
    setEditTarget(account);
  };

  const renderLeftActions = (account: AccountLike) => () => (
    <TouchableOpacity style={styles.editAction} onPress={() => handleEdit(account)}>
      <MaterialIcons name="edit" size={24} color="#FFFFFF" />
      <Text style={styles.editText}>Edit</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Accounts',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Total Balance</Text>
          <Text style={styles.balanceAmount}>
            ${accounts.reduce((acc, curr) => acc + BigInt(curr.balance || 0), BigInt(0)).toString()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Accounts</Text>
          <Text style={styles.hint}>Swipe right to edit, swipe left to remove.</Text>
          <View style={styles.list}>
            {accounts.map((account, index) => {
              const lbl = labelFor(account.address);
              const isPrimary = isPrimaryAccount(account, keys as any);
              return (
                <Swipeable
                  key={`${account.address}:${index}`}
                  renderRightActions={isPrimary ? undefined : renderRightActions(account)}
                  renderLeftActions={renderLeftActions(account)}
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
                        pathname: '/account-details',
                        params: { address: account.address },
                      })
                    }
                  >
                    <View style={styles.iconContainer}>
                      {lbl?.avatar ? (
                        <Text style={styles.iconEmoji}>{lbl.avatar}</Text>
                      ) : (
                        <MaterialIcons
                          name="account-balance-wallet"
                          size={24}
                          color="#3B82F6"
                        />
                      )}
                    </View>
                    <View style={styles.details}>
                      <View style={styles.titleRow}>
                        <Text
                          style={[styles.address, { flex: 1 }]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {lbl?.name ?? account.address}
                        </Text>
                        {isPrimary ? <PrimaryBadge variant="compact" /> : null}
                      </View>
                      {lbl?.name ? (
                        <Text style={styles.subAddress} numberOfLines={1} ellipsizeMode="middle">
                          {account.address}
                        </Text>
                      ) : null}
                      <Text style={styles.balance}>${account.balance.toString()}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                  </TouchableOpacity>
                </Swipeable>
              );
            })}
            {accounts.length === 0 && <Text style={styles.emptyText}>No accounts found</Text>}
          </View>
        </View>
      </ScrollView>

      <EditLabelModal
        visible={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title="Edit account"
        fallbackName={editTarget?.address ?? ''}
        initialName={editTarget ? labelFor(editTarget.address)?.name ?? '' : ''}
        initialAvatar={editTarget ? labelFor(editTarget.address)?.avatar ?? null : null}
        avatarPickerTitle="Pick account avatar"
        onSave={({ name, avatar }) => {
          if (editTarget) setLabel('accounts', editTarget.address, { name, avatar: avatar ?? undefined });
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
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#0F172A',
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
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    marginBottom: 4,
  },
  address: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  subAddress: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  balance: {
    fontSize: 14,
    color: '#64748B',
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
