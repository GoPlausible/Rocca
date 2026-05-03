import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Modal } from '@/components/Modal';
import { EmojiPickerModal } from '@/components/EmojiPickerModal';

export interface EditLabelModalProps {
  /** Controls visibility. The component clears its inputs when this flips false. */
  visible: boolean;
  onClose: () => void;
  /** Modal title — e.g. "Edit account", "Edit passkey", "Edit identity". */
  title: string;
  /** Greyed-out placeholder when no name override is set (typically the source-of-truth identifier). */
  fallbackName: string;
  /** Initial values to pre-fill when opening. */
  initialName?: string | null;
  initialAvatar?: string | null;
  /** Title shown in the emoji picker, e.g. "Pick account avatar". */
  avatarPickerTitle?: string;
  /** Saves the new label. Empty `name` should clear the name override. */
  onSave: (next: { name: string; avatar: string | null }) => void;
}

/**
 * Generic Edit modal mirroring the one inside Connections — name TextInput
 * + emoji avatar picker. Used by Accounts / Passkeys / Identities to
 * override the display label without mutating the underlying store.
 */
export function EditLabelModal(props: EditLabelModalProps): React.JSX.Element {
  const [name, setName] = useState(props.initialName ?? '');
  const [avatar, setAvatar] = useState<string | null>(props.initialAvatar ?? null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Reset inputs when the modal becomes visible (so opening for a different
  // entity starts with the right pre-filled values).
  useEffect(() => {
    if (props.visible) {
      setName(props.initialName ?? '');
      setAvatar(props.initialAvatar ?? null);
    }
  }, [props.visible, props.initialName, props.initialAvatar]);

  const save = (): void => {
    props.onSave({ name, avatar });
  };

  return (
    <>
      <Modal visible={props.visible} onClose={props.onClose} title={props.title}>
        <View style={styles.body}>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.8}
            >
              {avatar ? (
                <Text style={styles.avatarEmoji}>{avatar}</Text>
              ) : (
                <MaterialIcons name="emoji-emotions" size={28} color="#64748B" />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Avatar</Text>
              <Text style={styles.hint}>Tap the circle to pick an emoji.</Text>
            </View>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={props.fallbackName}
            placeholderTextColor="#94A3B8"
            autoFocus
            maxLength={64}
          />
          <Text style={styles.hint}>Leave empty to clear the custom name.</Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancel]}
              onPress={props.onClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.confirm]} onPress={save}>
              <Text style={styles.confirmText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <EmojiPickerModal
        visible={pickerOpen}
        initial={avatar}
        title={props.avatarPickerTitle ?? 'Pick avatar'}
        onClose={() => setPickerOpen(false)}
        onSelect={(emoji) => setAvatar(emoji)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 12,
    paddingVertical: 4,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 4,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  avatarEmoji: {
    fontSize: 32,
  },
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
    fontSize: 16,
    color: '#0F172A',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hint: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancel: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  confirm: {
    backgroundColor: '#3B82F6',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
