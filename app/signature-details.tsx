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
import { Stack, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useStore } from '@tanstack/react-store';
import { signaturesStore } from '@/stores/signatures';
import { BackChip } from '@/components/BackChip';

export default function SignatureDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entries = useStore(signaturesStore, (s) => s.entries);
  const entry = entries.find((e) => e.id === id);

  const copy = async (label: string, value: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Signature',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!entry ? (
          <Text style={styles.emptyText}>Signature not found.</Text>
        ) : (
          <>
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor:
                    entry.status === 'approved' ? '#10B981' : '#EF4444',
                  shadowColor: entry.status === 'approved' ? '#10B981' : '#EF4444',
                },
              ]}
            >
              <View style={styles.heroIcon}>
                <MaterialIcons
                  name={entry.status === 'approved' ? 'check-circle' : 'cancel'}
                  size={28}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.heroLabel}>{entry.status.toUpperCase()}</Text>
              <Text style={styles.heroValue} numberOfLines={2}>
                {entry.description}
              </Text>
            </View>

            <DetailRow label="Status" value={entry.status} />
            <DetailRow label="Kind" value={labelForKind(entry.kind)} />
            <DetailRow label="Key type" value={entry.keyType} />
            <DetailRow
              label="Timestamp"
              value={new Date(entry.ts).toLocaleString()}
            />
            {entry.origin ? (
              <DetailRow
                label="Origin"
                value={entry.origin}
                onCopy={() => copy('Origin', entry.origin!)}
              />
            ) : null}
            {entry.address ? (
              <DetailRow
                label="Algorand address"
                value={entry.address}
                onCopy={() => copy('Address', entry.address!)}
              />
            ) : null}
            <DetailRow
              label="Payload (base64)"
              value={entry.payloadBase64}
              onCopy={() => copy('Payload', entry.payloadBase64)}
            />
            {entry.signatureBase64 ? (
              <DetailRow
                label="Signature (base64)"
                value={entry.signatureBase64}
                onCopy={() => copy('Signature', entry.signatureBase64!)}
              />
            ) : null}
            {entry.reason ? (
              <DetailRow label="Rejection reason" value={entry.reason} />
            ) : null}
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

function labelForKind(kind: string | undefined): string {
  switch (kind) {
    case 'ac2.signing_request':
      return 'AC2 sign request';
    case 'liquid_auth.challenge':
      return 'Liquid Auth sign-in challenge';
    case 'webauthn.assertion':
      return 'WebAuthn passkey assertion';
    case 'transaction':
      return 'On-chain transaction';
    default:
      return 'Signature';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, gap: 16 },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
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
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  copyButton: { padding: 4 },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
  },
});
