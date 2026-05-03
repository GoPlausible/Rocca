import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
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
} from '@/stores/preferences';
import { isPrimaryAccount, isPrimaryIdentity } from '@/lib/primary-key';

export default function ProfileScreen() {
  const router = useRouter();
  const { accounts, identities, keys, key, account, identity, passkey } =
    useProvider();
  const userAvatarEmoji = useStore(preferencesStore, (s) => s.userAvatarEmoji);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

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
        {/* Avatar circle — tap-to-update directly opens the emoji picker. */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarCircle}
            onPress={() => setAvatarPickerOpen(true)}
            activeOpacity={0.8}
          >
            {userAvatarEmoji ? (
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
        visible={avatarPickerOpen}
        initial={userAvatarEmoji}
        title="Pick your avatar"
        onClose={() => setAvatarPickerOpen(false)}
        onSelect={(emoji) => setUserAvatarEmoji(emoji)}
      />

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
