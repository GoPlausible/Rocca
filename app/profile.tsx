import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import { useProvider } from '@/hooks/useProvider';
import { BackChip } from '@/components/BackChip';
import { EmojiPickerModal } from '@/components/EmojiPickerModal';
import { AboutModal } from '@/components/WelcomeModal';
import { appendActivity } from '@/stores/activity';
import {
  preferencesStore,
  setUserAvatarEmoji,
  setUserAvatarUri,
  clearUserAvatar,
} from '@/stores/preferences';
import { isPrimaryAccount, isPrimaryIdentity } from '@/lib/primary-key';

export default function ProfileScreen() {
  const router = useRouter();
  const { accounts, identities, keys, key, account, identity, passkey } =
    useProvider();
  const userAvatarEmoji = useStore(preferencesStore, (s) => s.userAvatarEmoji);
  const userAvatarUri = useStore(preferencesStore, (s) => s.userAvatarUri);
  // Two-step picker: tapping the avatar opens the source sheet (emoji /
  // gallery / camera / remove); choosing emoji opens the emoji modal.
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  // The source-sheet RNModal must fully close BEFORE we invoke the system
  // picker — otherwise on some Android skins (notably Samsung's stock
  // gallery) the activity-result callback is delivered while the modal
  // is still on the native stack, and the result silently never reaches
  // RN. A short delay lets the modal animation finish.
  const waitForModalDismiss = () => new Promise<void>((r) => setTimeout(r, 250));

  // Android low-memory recovery: if the OS destroys our activity while
  // the gallery+cropper is in the foreground (common on Samsung when
  // pinning two activities at once), the original
  // `await launchImageLibraryAsync` promise is lost — it never resolves.
  // expo-image-picker stores the orphaned result and exposes it via
  // `getPendingResultAsync()`. Drain it on profile mount so the avatar
  // updates as soon as the user is back on this screen.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pending = await ImagePicker.getPendingResultAsync();
        if (cancelled || !pending) return;
        if ('canceled' in pending && !pending.canceled) {
          const uri = pending.assets?.[0]?.uri;
          if (uri) setUserAvatarUri(uri);
        }
      } catch {
        /* best-effort recovery — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Raw URI from the picker. expo-image renders with `contentFit:
  // "cover"` so a non-square image still displays as a tidy circle —
  // good enough for an avatar without dragging in expo-image-manipulator
  // (which had cross-SDK binary-incompatibility headaches with our
  // SDK 54 base).
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
        'Allow photo library access in Settings to pick an avatar from your gallery.',
      );
      return;
    }
    // No `allowsEditing` — we crop in-app via expo-image-manipulator
    // afterwards. Bypassing the system cropper avoids the activity-stack
    // memory pressure that caused our app to silently lose the picker
    // result on Samsung devices.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    const uri = handlePickerResult(result);
    if (uri) setUserAvatarUri(uri);
  };

  const captureFromCamera = async () => {
    setSourceSheetOpen(false);
    await waitForModalDismiss();
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera access denied',
        'Allow camera access in Settings to take a photo for your avatar.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });
    const uri = handlePickerResult(result);
    if (uri) setUserAvatarUri(uri);
  };

  const openEmojiPicker = () => {
    setSourceSheetOpen(false);
    setEmojiPickerOpen(true);
  };

  const removeAvatar = () => {
    setSourceSheetOpen(false);
    clearUserAvatar();
  };

  const primaryAccount = accounts.find((a) => isPrimaryAccount(a, keys as any));
  const primaryIdentity = identities.find((i) => isPrimaryIdentity(i, keys as any));

  const accountAddress = primaryAccount?.address ?? '';
  const identityDid = primaryIdentity?.did ?? primaryIdentity?.address ?? '';

  const confirmReset = () => {
    Alert.alert(
      'Logout & reset onboarding',
      'This clears all accounts, identities, passkeys, and credentials on this device. Make sure you have your 24-word recovery phrase backed up. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            appendActivity({
              kind: 'app.reset',
              title: 'Wallet reset',
              subtitle: 'All accounts, identities, passkeys cleared',
            });
            await key.store.clear();
            await account.store.clear();
            await identity.store.clear();
            await passkey.store.clear();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Profile',
          headerShown: true,
          headerLeft: () => <BackChip />,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar circle — tap-to-update opens the source sheet (emoji /
            gallery / camera / remove). */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => setSourceSheetOpen(true)}
            activeOpacity={0.8}
          >
            {userAvatarUri ? (
              <Image
                source={{ uri: userAvatarUri }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            ) : userAvatarEmoji ? (
              <Text style={styles.avatarEmoji}>{userAvatarEmoji}</Text>
            ) : (
              <MaterialIcons name="account-circle" size={64} color="#3B82F6" />
            )}
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to update</Text>
        </View>

        {/* Primary account / primary identity action rows. Disabled if
            the source records are unexpectedly absent (defensive — should
            never happen post-onboarding because both are created
            atomically in the verify-success step). */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet</Text>

          <TouchableOpacity
            style={[styles.actionRow, !primaryAccount && styles.actionRowDisabled]}
            disabled={!primaryAccount}
            activeOpacity={0.8}
            onPress={() =>
              primaryAccount &&
              router.push({
                pathname: '/account-details',
                params: { address: primaryAccount.address },
              })
            }
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E1EFFF' }]}>
              <MaterialIcons
                name="account-balance-wallet"
                size={22}
                color="#3B82F6"
              />
            </View>
            <View style={styles.actionDetails}>
              <Text style={styles.actionTitle}>Primary account</Text>
              <Text
                style={styles.actionSub}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {primaryAccount
                  ? accountAddress
                  : 'No account yet — complete onboarding'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#CBD5E1" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, !primaryIdentity && styles.actionRowDisabled]}
            disabled={!primaryIdentity}
            activeOpacity={0.8}
            onPress={() =>
              primaryIdentity &&
              router.push({
                pathname: '/identity-details',
                params: { did: identityDid },
              })
            }
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FDF2F2' }]}>
              <MaterialIcons name="person" size={22} color="#EF4444" />
            </View>
            <View style={styles.actionDetails}>
              <Text style={styles.actionTitle}>Primary identity</Text>
              <Text
                style={styles.actionSub}
                numberOfLines={1}
                ellipsizeMode="middle"
              >
                {primaryIdentity
                  ? identityDid
                  : 'No identity yet — complete onboarding'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity
            style={styles.actionRow}
            activeOpacity={0.8}
            onPress={() => setAboutOpen(true)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#F1F5F9' }]}>
              <MaterialIcons name="info-outline" size={22} color="#64748B" />
            </View>
            <View style={styles.actionDetails}>
              <Text style={styles.actionTitle}>About Rocca</Text>
              <Text style={styles.actionSub}>
                Version, GoPlausible enhancements
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#CBD5E1" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>
            Danger zone
          </Text>
          <TouchableOpacity
            style={[styles.actionRow, styles.dangerRow]}
            activeOpacity={0.85}
            onPress={confirmReset}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FEF2F2' }]}>
              <MaterialIcons name="logout" size={22} color="#EF4444" />
            </View>
            <View style={styles.actionDetails}>
              <Text style={[styles.actionTitle, { color: '#B91C1C' }]}>
                Logout & reset onboarding
              </Text>
              <Text style={styles.actionSub}>
                Clears every key on this device. Recoverable from your 24-word
                phrase.
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EmojiPickerModal
        visible={emojiPickerOpen}
        initial={userAvatarEmoji}
        title="Pick your avatar"
        onClose={() => setEmojiPickerOpen(false)}
        onSelect={(emoji) => setUserAvatarEmoji(emoji)}
      />

      {/* Conditionally rendered — keeping the Modal mounted with
          `visible=false` left a hidden native Dialog window on Android
          that ate touch events from activities launched afterwards
          (e.g. the expo-image-picker cropper's CROP and back buttons
          stopped responding on Samsung). Unmounting fully releases the
          window. */}
      {sourceSheetOpen && (
      <Modal
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
            <Text style={styles.sheetTitle}>Update avatar</Text>
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
            {(userAvatarEmoji || userAvatarUri) && (
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
      </Modal>
      )}

      <AboutModal visible={aboutOpen} onClose={() => setAboutOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  avatarEmoji: {
    fontSize: 56,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
  avatarHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  dangerSectionTitle: {
    color: '#B91C1C',
  },
  actionRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  actionRowDisabled: {
    opacity: 0.5,
  },
  dangerRow: {
    borderColor: '#FECACA',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionDetails: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  actionSub: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'monospace',
  },
});
