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
import { useStore } from '@tanstack/react-store';
import { base64 } from '@scure/base';
import {
  vcsStore,
  addVC,
  removeVC,
  buildAP2MandateCredential,
  type AP2MandateInput,
  type VC,
} from '@/stores/vcs';
import { appendActivity } from '@/stores/activity';
import { useProvider } from '@/hooks/useProvider';
import { BackChip } from '@/components/BackChip';
import { Modal } from '@/components/Modal';

export default function VCsScreen() {
  const router = useRouter();
  const { identities, key, keys } = useProvider();
  const entries = useStore(vcsStore, (s) => [...s.entries].reverse());

  const openRowRef = useRef<Swipeable | null>(null);
  const [issueOpen, setIssueOpen] = useState(false);
  const [agentDid, setAgentDid] = useState('');
  const [purpose, setPurpose] = useState('');
  const [cap, setCap] = useState('');
  const [validFor, setValidFor] = useState('');
  const [issuing, setIssuing] = useState(false);

  const activeIdentity = identities[0];

  const resetForm = () => {
    setAgentDid('');
    setPurpose('');
    setCap('');
    setValidFor('');
  };

  const issueAP2Mandate = async () => {
    if (!activeIdentity?.did) {
      Alert.alert('No identity', 'No DID available. Complete onboarding first.');
      return;
    }
    if (!agentDid.trim() || !purpose.trim()) {
      Alert.alert('Missing fields', 'Agent DID and Purpose are required.');
      return;
    }
    setIssuing(true);
    try {
      const identityKey = (keys as any[]).find(
        (k) =>
          k.type === 'hd-derived-ed25519' &&
          (k.metadata?.context ?? -1) === 1 &&
          k.publicKey instanceof Uint8Array,
      );
      if (!identityKey) {
        throw new Error('No identity (context=1) signing key found.');
      }
      const id = `urn:uuid:${cryptoRandomUUID()}`;
      const issuanceDate = new Date().toISOString();
      const mandate: AP2MandateInput = {
        agentDid: agentDid.trim(),
        purpose: purpose.trim(),
        ...(cap.trim() ? { cap: cap.trim() } : {}),
        ...(validFor.trim() ? { validFor: validFor.trim() } : {}),
      };
      const doc = buildAP2MandateCredential({
        id,
        issuer: activeIdentity.did,
        issuanceDate,
        mandate,
      });

      // Sign the canonical JSON of the credential body using the
      // identity Ed25519 key — minimal proof for v0. Future: align with
      // Data Integrity / VC-DI spec.
      const canonical = JSON.stringify(doc);
      const sig = await key.store.sign(
        identityKey.id,
        new TextEncoder().encode(canonical),
      );
      doc.proof = {
        type: 'Ed25519Signature2020',
        created: issuanceDate,
        verificationMethod: `${activeIdentity.did}#${activeIdentity.did.split(':')[2] ?? ''}`,
        proofPurpose: 'assertionMethod',
        proofValue: base64.encode(sig),
      };

      const subjectSummary = `Agent ${shortDid(agentDid.trim())} → ${purpose.trim()}`;
      const vc: VC = {
        id,
        ts: Date.now(),
        template: 'ap2-mandate',
        issuer: activeIdentity.did,
        subjectSummary,
        document: doc,
      };
      addVC(vc);
      appendActivity({
        kind: 'vc.issued',
        title: 'Credential issued',
        subtitle: subjectSummary,
        meta: { id, template: 'ap2-mandate' },
      });
      resetForm();
      setIssueOpen(false);
    } catch (err) {
      Alert.alert('Issue failed', (err as Error).message);
    } finally {
      setIssuing(false);
    }
  };

  const handleDelete = (vc: VC) => {
    Alert.alert(
      'Remove credential',
      `Delete "${vc.subjectSummary}"? This only removes the local record.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => openRowRef.current?.close() },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            openRowRef.current?.close();
            openRowRef.current = null;
            removeVC(vc.id);
            appendActivity({
              kind: 'vc.removed',
              title: 'Credential removed',
              subtitle: vc.subjectSummary,
              meta: { id: vc.id },
            });
          },
        },
      ],
    );
  };

  const renderRightActions = (vc: VC) => () => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => handleDelete(vc)}>
      <MaterialIcons name="delete-outline" size={24} color="#FFFFFF" />
      <Text style={styles.deleteText}>Remove</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Credentials',
          headerShown: true,
          headerLeft: () => <BackChip />,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setIssueOpen(true)}
              style={styles.issueLink}
              hitSlop={6}
            >
              <Text style={styles.issueLinkText}>Issue</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verifiable Credentials</Text>
          <Text style={styles.hint}>Swipe left to remove. Tap an item for full document.</Text>
          <View style={styles.list}>
            {entries.map((vc) => (
              <Swipeable
                key={vc.id}
                renderRightActions={renderRightActions(vc)}
                // RN Gesture Handler passes (direction, swipeableInstance)
                // at runtime but the type only declares one argument; cast
                // matches the proven pattern used in connections.tsx.
                onSwipeableWillOpen={
                  ((_dir: 'left' | 'right', sw: Swipeable) => {
                    if (openRowRef.current && openRowRef.current !== sw) {
                      try { openRowRef.current.close(); } catch { /* ignore */ }
                    }
                  }) as unknown as (direction: 'left' | 'right') => void
                }
                onSwipeableOpen={
                  ((_dir: 'left' | 'right', sw: Swipeable) => {
                    openRowRef.current = sw;
                  }) as unknown as (direction: 'left' | 'right') => void
                }
                onSwipeableClose={() => {
                  openRowRef.current = null;
                }}
              >
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.card}
                  onPress={() =>
                    router.push({ pathname: '/vc-details', params: { id: vc.id } })
                  }
                >
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="verified-user" size={24} color="#D97706" />
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.title} numberOfLines={1}>
                      {vc.subjectSummary}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {vc.template} · {new Date(vc.ts).toLocaleDateString()}
                    </Text>
                    <Text style={styles.issuer} numberOfLines={1} ellipsizeMode="middle">
                      Issued by {vc.issuer}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                </TouchableOpacity>
              </Swipeable>
            ))}
            {entries.length === 0 && (
              <Text style={styles.emptyText}>No credentials yet</Text>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={issueOpen}
        onClose={() => setIssueOpen(false)}
        title="Issue AP2 mandate"
      >
        <View style={styles.formBody}>
          <Text style={styles.label}>Agent DID *</Text>
          <TextInput
            style={styles.input}
            value={agentDid}
            onChangeText={setAgentDid}
            placeholder="did:key:z6Mk…"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Purpose *</Text>
          <TextInput
            style={styles.input}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="LLM inference budget for April"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Cap (optional)</Text>
          <TextInput
            style={styles.input}
            value={cap}
            onChangeText={setCap}
            placeholder="100 USDC"
            placeholderTextColor="#94A3B8"
          />

          <Text style={styles.label}>Valid for (ISO duration, optional)</Text>
          <TextInput
            style={styles.input}
            value={validFor}
            onChangeText={setValidFor}
            placeholder="P30D"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
          />

          <Text style={styles.formHint}>
            Signed with your identity key. Issuer:{' '}
            {activeIdentity?.did
              ? shortDid(activeIdentity.did)
              : '— no identity available —'}
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancel]}
              onPress={() => {
                resetForm();
                setIssueOpen(false);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.confirm]}
              disabled={issuing}
              onPress={issueAP2Mandate}
            >
              <Text style={styles.confirmText}>{issuing ? 'Issuing…' : 'Issue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function shortDid(did: string): string {
  if (did.length <= 24) return did;
  return `${did.slice(0, 12)}…${did.slice(-8)}`;
}

function cryptoRandomUUID(): string {
  // RN doesn't ship crypto.randomUUID by default; this is a sufficient v4-ish
  // generator for VC `id` URNs (collision risk negligible for local-only IDs).
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 32; i++) {
    s += hex[Math.floor(Math.random() * 16)];
  }
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`;
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
    backgroundColor: '#FEF3C7',
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
  issuer: { fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 20 },
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
  issueLink: { paddingHorizontal: 12, paddingVertical: 4, marginRight: 4 },
  issueLinkText: { color: '#3B82F6', fontWeight: '700', fontSize: 14 },
  formBody: { gap: 12, paddingVertical: 4 },
  label: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formHint: { fontSize: 11, color: '#94A3B8', fontFamily: 'monospace' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  button: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  cancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
  confirm: { backgroundColor: '#D97706' },
  confirmText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
