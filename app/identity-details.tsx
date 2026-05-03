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
import { useProvider } from '@/hooks/useProvider';
import { BackChip } from '@/components/BackChip';
import { labelsStore } from '@/stores/labels';

export default function IdentityDetailsScreen() {
  const { did } = useLocalSearchParams<{ did?: string }>();
  const { identities } = useProvider();
  const labels = useStore(labelsStore, (s) => s.byKey);

  const identity = identities.find(
    (i: any) => i.did === did || i.address === did,
  );
  // Labels are keyed by `did` when available, fall back to `address`
  // (mirrors `labelKeyOf` in identities.tsx).
  const labelKey = identity?.did ?? identity?.address ?? did ?? '';
  const label = labelKey ? labels[`identities:${labelKey}`] : undefined;

  const copy = async (label: string, value: string) => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const didDocumentJson =
    identity?.didDocument !== undefined
      ? JSON.stringify(identity.didDocument, null, 2)
      : '';
  const metadataJson =
    identity?.metadata && Object.keys(identity.metadata).length > 0
      ? JSON.stringify(identity.metadata, null, 2)
      : '';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: label?.name ?? 'Identity',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!identity ? (
          <Text style={styles.emptyText}>Identity not found.</Text>
        ) : (
          <>
            <View style={styles.heroCard}>
              <View style={styles.heroIcon}>
                {label?.avatar ? (
                  <Text style={styles.heroAvatarEmoji}>{label.avatar}</Text>
                ) : (
                  <MaterialIcons name="person" size={28} color="#FFFFFF" />
                )}
              </View>
              {label?.name ? (
                <>
                  <Text style={styles.heroName} numberOfLines={1}>
                    {label.name}
                  </Text>
                  <Text style={styles.heroLabel}>{identity.type || 'identity'}</Text>
                  <Text
                    style={styles.heroValue}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {identity.did || identity.address}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.heroLabel}>{identity.type || 'identity'}</Text>
                  <Text
                    style={styles.heroValue}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {identity.did || identity.address}
                  </Text>
                </>
              )}
            </View>

            {identity.did ? (
              <DetailRow
                label="DID"
                value={identity.did}
                onCopy={() => copy('DID', identity.did!)}
              />
            ) : null}
            {identity.address && identity.address !== identity.did ? (
              <DetailRow
                label="Address"
                value={identity.address}
                onCopy={() => copy('Address', identity.address)}
              />
            ) : null}
            <DetailRow label="Type" value={identity.type || 'unknown'} />

            {didDocumentJson ? (
              <BlockRow
                label="DID Document"
                json={didDocumentJson}
                onCopy={() => copy('DID Document', didDocumentJson)}
              />
            ) : null}

            {metadataJson ? (
              <BlockRow
                label="Metadata"
                json={metadataJson}
                onCopy={() => copy('Metadata', metadataJson)}
              />
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

function BlockRow({
  label,
  json,
  onCopy,
}: {
  label: string;
  json: string;
  onCopy: () => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.blockHeader}>
        <Text style={styles.rowLabel}>{label}</Text>
        <TouchableOpacity onPress={onCopy} hitSlop={12} style={styles.copyButton}>
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
          {json}
        </Text>
      </ScrollView>
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
    backgroundColor: '#EF4444',
    borderRadius: 24,
    padding: 24,
    alignItems: 'flex-start',
    elevation: 4,
    shadowColor: '#EF4444',
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
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  heroName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 0.2,
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
    fontSize: 14,
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
  copyButton: {
    padding: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
  },
});
