import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal as RNModal,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Modal } from '@/components/Modal';
import { EmojiPickerModal } from '@/components/EmojiPickerModal';
import { LabelAvatar } from '@/components/LabelAvatar';

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
  /**
   * When true, tapping the avatar opens a source sheet (emoji / gallery /
   * camera / remove). When false (default), it opens the emoji picker
   * directly. Image avatars are stored as `data:image/...;base64,...` so
   * they survive cache purges and round-trip through the same `avatar`
   * string field as emoji glyphs.
   */
  allowImageAvatar?: boolean;
  /** Saves the new label. Empty `name` should clear the name override. */
  onSave: (next: { name: string; avatar: string | null }) => void;
}

/**
 * Generic Edit modal mirroring the one inside Connections — name TextInput
 * + avatar picker. Used by Accounts / Passkeys / Identities to override
 * the display label without mutating the underlying store.
 */
export function EditLabelModal(props: EditLabelModalProps): React.JSX.Element {
  const [name, setName] = useState(props.initialName ?? '');
  const [avatar, setAvatar] = useState<string | null>(props.initialAvatar ?? null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);

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

  const openAvatarSheet = () => {
    if (props.allowImageAvatar) setSourceSheetOpen(true);
    else setEmojiPickerOpen(true);
  };

  // See profile.tsx for the full rationale: the source-sheet RNModal must
  // be fully dismissed before the picker launches, and we skip
  // `allowsEditing` to avoid Samsung's system cropper which doesn't
  // return its result reliably.
  const waitForModalDismiss = () => new Promise<void>((r) => setTimeout(r, 250));

  const handlePickerResult = (
    result: ImagePicker.ImagePickerResult,
  ): string | null => {
    if (result.canceled) return null;
    const uri = result.assets?.[0]?.uri;
    if (!uri) {
      Alert.alert(
        'Could not load image',
        'The picker returned without a usable image. Please try again.',
      );
      return null;
    }
    return uri;
  };

  const pickFromGallery = async () => {
    setSourceSheetOpen(false);
    await waitForModalDismiss();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access denied',
        'Allow photo library access in Settings to pick an image avatar.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const uri = handlePickerResult(result);
    if (uri) setAvatar(uri);
  };

  const captureFromCamera = async () => {
    setSourceSheetOpen(false);
    await waitForModalDismiss();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera access denied',
        'Allow camera access in Settings to take a photo for this avatar.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    const uri = handlePickerResult(result);
    if (uri) setAvatar(uri);
  };

  const openEmojiPicker = () => {
    setSourceSheetOpen(false);
    setEmojiPickerOpen(true);
  };

  const removeAvatar = () => {
    setSourceSheetOpen(false);
    setAvatar(null);
  };

  return (
    <>
      <Modal visible={props.visible} onClose={props.onClose} title={props.title}>
        <View style={styles.body}>
          <View style={styles.avatarRow}>
            <TouchableOpacity
              style={styles.avatarCircle}
              onPress={openAvatarSheet}
              activeOpacity={0.8}
            >
              {avatar ? (
                <LabelAvatar avatar={avatar} emojiSize={32} />
              ) : (
                <MaterialIcons name="emoji-emotions" size={28} color="#64748B" />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Avatar</Text>
              <Text style={styles.hint}>
                {props.allowImageAvatar
                  ? 'Tap the circle to pick emoji, gallery, or camera.'
                  : 'Tap the circle to pick an emoji.'}
              </Text>
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
        visible={emojiPickerOpen}
        initial={avatar}
        title={props.avatarPickerTitle ?? 'Pick avatar'}
        onClose={() => setEmojiPickerOpen(false)}
        onSelect={(emoji) => setAvatar(emoji)}
      />

      {/* Conditionally rendered — see profile.tsx for the rationale on why
          a hidden RNModal must be unmounted (else it eats touches from the
          cropper activity launched after). */}
      {sourceSheetOpen && (
      <RNModal
        visible={sourceSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSourceSheetOpen(false)}
      >
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={() => setSourceSheetOpen(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>{props.avatarPickerTitle ?? 'Update avatar'}</Text>
            <TouchableOpacity style={styles.sheetRow} onPress={openEmojiPicker}>
              <View style={[styles.sheetIcon, { backgroundColor: '#FEF3C7' }]}>
                <MaterialIcons name="emoji-emotions" size={22} color="#D97706" />
              </View>
              <Text style={styles.sheetRowText}>Pick an emoji</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetRow} onPress={pickFromGallery}>
              <View style={[styles.sheetIcon, { backgroundColor: '#E1EFFF' }]}>
                <MaterialIcons name="photo-library" size={22} color="#3B82F6" />
              </View>
              <Text style={styles.sheetRowText}>Choose from gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetRow} onPress={captureFromCamera}>
              <View style={[styles.sheetIcon, { backgroundColor: '#ECFDF5' }]}>
                <MaterialIcons name="photo-camera" size={22} color="#10B981" />
              </View>
              <Text style={styles.sheetRowText}>Take a photo</Text>
            </TouchableOpacity>
            {avatar && (
              <TouchableOpacity style={styles.sheetRow} onPress={removeAvatar}>
                <View style={[styles.sheetIcon, { backgroundColor: '#FEF2F2' }]}>
                  <MaterialIcons name="delete-outline" size={22} color="#EF4444" />
                </View>
                <Text style={[styles.sheetRowText, { color: '#B91C1C' }]}>
                  Remove avatar
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.sheetCancel}
              onPress={() => setSourceSheetOpen(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>
      )}
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
    overflow: 'hidden',
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  sheetIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  sheetCancel: {
    marginTop: 6,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.4,
  },
});
