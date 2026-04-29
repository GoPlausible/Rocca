import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { encodeAddress } from '@algorandfoundation/keystore';
import { useProvider } from '@/hooks/useProvider';
import { BackChip } from '@/components/BackChip';

export default function AccountDetailsScreen() {
  const router = useRouter();
  const { address } = useLocalSearchParams<{ address?: string }>();
  const { accounts, keys } = useProvider();

  const account = accounts.find((a: any) => a.address === address);
  const keyId: string | undefined = account?.metadata?.keyId;
  const key = keyId ? (keys as any[]).find((k) => k.id === keyId) : undefined;

  const publicKeyBase64: string = account?.address ?? '';
  const algorandAddress: string =
    key?.publicKey instanceof Uint8Array ? encodeAddress(key.publicKey) : '';
  const balance: string = account ? account.balance.toString() : '0';

  const copy = async (label: string, value: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Account',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!account ? (
          <Text style={styles.emptyText}>Account not found.</Text>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <MaterialIcons name="account-balance-wallet" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.heroLabel}>Balance</Text>
              <Text style={styles.heroValue}>${balance}</Text>
            </View>

            <DetailRow
              label="Public key (base64)"
              value={publicKeyBase64}
              onCopy={() => copy('Public key', publicKeyBase64)}
            />
            <DetailRow
              label="Algorand address"
              value={algorandAddress || 'Unavailable (key not loaded)'}
              onCopy={
                algorandAddress ? () => copy('Algorand address', algorandAddress) : undefined
              }
            />
            <DetailRow label="Balance" value={`$${balance}`} />
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
    backgroundColor: '#3B82F6',
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    elevation: 4,
    shadowColor: '#3B82F6',
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
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 32,
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
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  copyButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
  },
});
