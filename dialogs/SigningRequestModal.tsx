import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { base64 } from '@scure/base';
import { Modal } from '@/components/Modal';
import type { PendingSigningRequest } from '@/hooks/useConnection';

interface Props {
  request: PendingSigningRequest | null;
  onApprove: () => Promise<void> | void;
  onReject: (reason?: string) => void;
}

export function SigningRequestModal({ request, onApprove, onReject }: Props) {
  const [isApproving, setIsApproving] = useState(false);

  const preview = useMemo(() => {
    if (!request) return '';
    try {
      const bytes = base64.decode(request.payload);
      const hint = request.displayHint;
      if (hint === 'hex') {
        return Array.from(bytes)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }
      const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (hint === 'json') {
        try {
          return JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          return text;
        }
      }
      return text;
    } catch {
      return '<failed to decode payload>';
    }
  }, [request]);

  if (!request) return null;

  return (
    <Modal
      visible={!!request}
      onClose={() => onReject('Closed by user')}
      title="Signature Request"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcons name="security" size={28} color="#3B82F6" />
          <Text style={styles.description} numberOfLines={4}>
            {request.description}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Key</Text>
          <Text style={styles.metaValue}>{request.keyType}</Text>
        </View>

        <Text style={styles.previewLabel}>Payload preview</Text>
        <ScrollView style={styles.preview} contentContainerStyle={{ padding: 12 }}>
          <Text selectable style={styles.previewText}>
            {preview}
          </Text>
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            disabled={isApproving}
            onPress={() => onReject()}
          >
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.approveButton, isApproving && { opacity: 0.6 }]}
            disabled={isApproving}
            onPress={async () => {
              setIsApproving(true);
              try {
                await onApprove();
              } finally {
                setIsApproving(false);
              }
            }}
          >
            {isApproving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.approveText}>Approve & Sign</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  header: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  description: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '700',
  },
  previewLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  preview: {
    maxHeight: 200,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rejectText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  approveButton: {
    backgroundColor: '#3B82F6',
  },
  approveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
