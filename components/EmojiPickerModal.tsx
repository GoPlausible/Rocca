import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Modal } from '@/components/Modal';

const DEFAULT_EMOJIS = [
  '🦊', '🐼', '🐸', '🐧', '🐶', '🐱', '🦄', '🐢',
  '🦁', '🐯', '🐻', '🐨', '🐰', '🐭', '🐹', '🐮',
  '🦉', '🦅', '🐲', '🐳', '🐙', '🦋', '🌸', '🌻',
  '🌈', '⭐', '🔥', '💎', '🎯', '🎨', '🚀', '⚡',
  '🎮', '🎲', '🎵', '🎁', '🌍', '🌙', '☀️', '❄️',
  '🍕', '🍔', '🍣', '🍜', '🍩', '🍦', '☕', '🍺',
  '⚽', '🏀', '🎸', '📚', '💻', '📱', '🎬', '📷',
  '😀', '😎', '🤖', '👾', '👻', '🦸', '🧙', '🧑‍🚀',
];

interface Props {
  visible: boolean;
  initial?: string | null;
  title?: string;
  onClose: () => void;
  onSelect: (emoji: string | null) => void;
}

export function EmojiPickerModal({ visible, initial, title, onClose, onSelect }: Props) {
  const [picked, setPicked] = useState<string | null>(initial ?? null);

  return (
    <Modal visible={visible} onClose={onClose} title={title ?? 'Pick an avatar'}>
      <View style={styles.container}>
        <View style={styles.preview}>
          <View style={styles.previewCircle}>
            <Text style={styles.previewEmoji}>{picked ?? '🙂'}</Text>
          </View>
          <Text style={styles.previewHint}>
            {picked ? 'Tap Save to apply' : 'Pick one below or tap Clear to remove'}
          </Text>
        </View>

        <FlatList
          data={DEFAULT_EMOJIS}
          numColumns={6}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.cell, picked === item && styles.cellSelected]}
              onPress={() => setPicked(item)}
            >
              <Text style={styles.cellEmoji}>{item}</Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost]}
            onPress={() => {
              setPicked(null);
              onSelect(null);
              onClose();
            }}
          >
            <Text style={styles.btnGhostText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={() => {
              onSelect(picked);
              onClose();
            }}
          >
            <Text style={styles.btnPrimaryText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  preview: { alignItems: 'center', gap: 6 },
  previewCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewEmoji: { fontSize: 44 },
  previewHint: { fontSize: 12, color: '#64748B' },
  grid: { paddingVertical: 4 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  cellSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
  },
  cellEmoji: { fontSize: 24 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 6 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnGhost: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  btnGhostText: { color: '#64748B', fontSize: 15, fontWeight: '600' },
  btnPrimary: { backgroundColor: '#3B82F6' },
  btnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
