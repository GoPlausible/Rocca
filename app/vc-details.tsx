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
import { vcsStore } from '@/stores/vcs';
import { BackChip } from '@/components/BackChip';

export default function VCDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entries = useStore(vcsStore, (s) => s.entries);
  const vc = entries.find((e) => e.id === id);

  const copy = async (label: string, value: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const documentJson = vc ? JSON.stringify(vc.document, null, 2) : '';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Credential',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!vc ? (
          <Text style={styles.emptyText}>Credential not found.</Text>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                <MaterialIcons name="verified-user" size={28} color="#FFFFFF" />
              </View>
              <Text style={styles.heroLabel}>{vc.template}</Text>
              <Text style={styles.heroValue} numberOfLines={2}>
                {vc.subjectSummary}
              </Text>
            </View>

            <DetailRow
              label="ID"
              value={vc.id}
              onCopy={() => copy('ID', vc.id)}
            />
            <DetailRow
              label="Issuer DID"
              value={vc.issuer}
              onCopy={() => copy('Issuer', vc.issuer)}
            />
            <DetailRow
              label="Issued"
              value={new Date(vc.ts).toLocaleString()}
            />
            {vc.revoked ? (
              <DetailRow label="Status" value="Revoked (local)" />
            ) : null}

            <View style={styles.row}>
              <View style={styles.blockHeader}>
                <Text style={styles.rowLabel}>Document</Text>
                <TouchableOpacity
                  onPress={() => copy('VC document', documentJson)}
                  hitSlop={12}
                  style={styles.copyButton}
                >
                  <MaterialIcons name="content-copy" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                style={styles.jsonScroll}
                contentContainerStyle={{ flexGrow: 0 }}
                showsHorizontalScrollIndicator
              >
                <Text style={styles.jsonText} selectable>
                  {documentJson}
                </Text>
              </ScrollView>
            </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, gap: 16 },
  heroCard: {
    backgroundColor: '#D97706',
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    elevation: 4,
    shadowColor: '#D97706',
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
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  jsonScroll: {
    flexGrow: 0,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  jsonText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#0F172A',
    lineHeight: 18,
  },
  copyButton: { padding: 4 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40 },
});
