import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { toBase64URL } from '@goplausible/liquid-client/encoding';
import { useStore } from '@tanstack/react-store';
import { useProvider } from '@/hooks/useProvider';
import { BackChip } from '@/components/BackChip';
import { LabelAvatar } from '@/components/LabelAvatar';
import { labelsStore } from '@/stores/labels';

export default function PasskeyDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { passkeys, passkey: passkeyApi } = useProvider();
  const labels = useStore(labelsStore, (s) => s.byKey);

  const passkey = passkeys.find((p: any) => p.id === id);
  const label = id ? labels[`passkeys:${id}`] : undefined;
  const displayName = label?.name ?? passkey?.name ?? '';

  const copy = async (label: string, value: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const handleDelete = () => {
    if (!passkey) return;
    Alert.alert('Delete Passkey', `Are you sure you want to delete "${passkey.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await passkeyApi.store.removePasskey(passkey.id);
            router.back();
          } catch (error) {
            console.error('Failed to remove passkey:', error);
            Alert.alert('Error', 'Failed to remove passkey');
          }
        },
      },
    ]);
  };

  const publicKeyBase64 =
    passkey?.publicKey instanceof Uint8Array
      ? toBase64URL(passkey.publicKey)
      : '';
  const origin: string | undefined = passkey?.metadata?.origin;
  const keyId: string | undefined = passkey?.metadata?.keyId;
  const userHandleRaw = passkey?.metadata?.userHandle;
  const userHandleB64 =
    userHandleRaw instanceof Uint8Array
      ? toBase64URL(userHandleRaw)
      : userHandleRaw && typeof userHandleRaw === 'object'
      ? toBase64URL(new Uint8Array(Object.values(userHandleRaw) as number[]))
      : '';
  const registered = passkey?.metadata?.registered ? 'Yes' : 'No';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: label?.name ?? 'Passkey',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!passkey ? (
          <Text style={styles.emptyText}>Passkey not found.</Text>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                {label?.avatar ? (
                  <LabelAvatar avatar={label.avatar} emojiSize={28} />
                ) : (
                  <MaterialIcons name="fingerprint" size={28} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.heroLabel}>{passkey.algorithm || 'Passkey'}</Text>
              <Text style={styles.heroValue} numberOfLines={2}>
                {displayName}
              </Text>
              {label?.name && passkey.name && label.name !== passkey.name ? (
                <Text style={styles.heroSubvalue} numberOfLines={1}>
                  {passkey.name}
                </Text>
              ) : null}
            </View>

            <DetailRow
              label="Credential ID"
              value={passkey.id}
              onCopy={() => copy('Credential ID', passkey.id)}
            />
            {publicKeyBase64 ? (
              <DetailRow
                label="Public key (base64url)"
                value={publicKeyBase64}
                onCopy={() => copy('Public key', publicKeyBase64)}
              />
            ) : null}
            <DetailRow label="Algorithm" value={passkey.algorithm || 'unknown'} />
            {origin ? (
              <DetailRow
                label="Origin"
                value={origin}
                onCopy={() => copy('Origin', origin)}
              />
            ) : null}
            {keyId ? (
              <DetailRow
                label="Linked key ID"
                value={keyId}
                onCopy={() => copy('Key ID', keyId)}
              />
            ) : null}
            {userHandleB64 ? (
              <DetailRow
                label="User handle (base64url)"
                value={userHandleB64}
                onCopy={() => copy('User handle', userHandleB64)}
              />
            ) : null}
            <DetailRow label="Registered with provider" value={registered} />
            <DetailRow
              label="Created"
              value={
                passkey.createdAt
                  ? new Date(passkey.createdAt).toLocaleString()
                  : 'Unknown'
              }
            />

            <TouchableOpacity
              style={styles.deleteButton}
              activeOpacity={0.85}
              onPress={handleDelete}
            >
              <MaterialIcons name="delete-outline" size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Delete passkey</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowValueContainer}>
        <Text style={styles.rowValue} selectable>
          {value}
        </Text>
        {onCopy && (
          <TouchableOpacity onPress={onCopy} hitSlop={12} style={styles.copyButton}>
            <MaterialIcons name="content-copy" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    gap: 16,
  },
  heroCard: {
    backgroundColor: '#10B981',
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  heroSubvalue: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  heroAvatarEmoji: {
    fontSize: 30,
  },
  row: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rowLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  rowValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowValue: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  copyButton: {
    padding: 4,
  },
  deleteButton: {
    marginTop: 8,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
  },
});
