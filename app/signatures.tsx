import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import { signaturesStore } from '@/stores/signatures';
import { BackChip } from '@/components/BackChip';

export default function SignaturesScreen() {
  const router = useRouter();
  const entries = useStore(signaturesStore, (s) =>
    [...s.entries].reverse(),
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Signatures',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signing History</Text>
          <Text style={styles.hint}>Approved and rejected signature operations.</Text>
          <View style={styles.list}>
            {entries.map((entry) => {
              const visual =
                entry.status === 'approved'
                  ? { icon: 'check-circle' as const, color: '#10B981', bg: '#ECFDF5' }
                  : { icon: 'cancel' as const, color: '#EF4444', bg: '#FEF2F2' };
              return (
                <TouchableOpacity
                  key={entry.id}
                  activeOpacity={0.8}
                  style={styles.card}
                  onPress={() =>
                    router.push({ pathname: '/signature-details', params: { id: entry.id } })
                  }
                >
                  <View
                    style={[styles.iconContainer, { backgroundColor: visual.bg }]}
                  >
                    <MaterialIcons name={visual.icon} size={24} color={visual.color} />
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.title} numberOfLines={1}>
                      {entry.description}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {labelForKind(entry.kind)} · {entry.keyType} key ·{' '}
                      {new Date(entry.ts).toLocaleString()}
                    </Text>
                    {entry.origin ? (
                      <Text style={styles.origin} numberOfLines={1} ellipsizeMode="middle">
                        {entry.origin}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity>
              );
            })}
            {entries.length === 0 && (
              <Text style={styles.emptyText}>No signatures yet</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function labelForKind(kind: string | undefined): string {
  switch (kind) {
    case 'ac2.signing_request':
      return 'AC2 sign';
    case 'liquid_auth.challenge':
      return 'Sign-in';
    case 'webauthn.assertion':
      return 'Passkey';
    case 'transaction':
      return 'Transaction';
    default:
      return 'Signature';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  section: { marginBottom: 32 },
  sectionTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  hint: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },
  list: { gap: 12 },
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  meta: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  origin: { fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20 },
});
