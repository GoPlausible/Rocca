import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useStore } from '@tanstack/react-store';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { WelcomeModal } from '@/components/WelcomeModal';
import { useProvider } from '@/hooks/useProvider';
import {
  preferencesStore,
  toggleBalanceHidden,
} from '@/stores/preferences';
import { activityStore, type ActivityEntry } from '@/stores/activity';
import { vcsStore } from '@/stores/vcs';
import { signaturesStore } from '@/stores/signatures';

// Extract provider configuration from expo-constants
const config = Constants.expoConfig?.extra?.provider || {
  name: 'Rocca',
  primaryColor: '#3B82F6',
  secondaryColor: '#E1EFFF',
  accentColor: '#10B981',
  welcomeMessage: 'Your identity, connected.',
  showAccounts: true,
  showPasskeys: true,
  showIdentities: true,
  showConnections: true,
};

export default function LandingScreen() {
  const router = useRouter();
  const { identities, accounts, passkeys, sessions } = useProvider();
  const userAvatarEmoji = useStore(preferencesStore, (s) => s.userAvatarEmoji);
  const balanceHidden = useStore(preferencesStore, (s) => s.balanceHidden);
  const vcEntries = useStore(vcsStore, (s) => s.entries);
  const signatureEntries = useStore(signaturesStore, (s) => s.entries);
  const recentActivity = useStore(
    activityStore,
    (s) => s.entries.slice(-5).reverse() as ActivityEntry[],
  );

  const activeIdentity = identities[0];
  const activeAccount = accounts[0];

  const {
    name,
    primaryColor,
    secondaryColor,
    accentColor,
    showAccounts,
    showPasskeys,
    showIdentities,
    showConnections,
  } = config;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Hide the navigation header on the landing page. The "Rocca" title
          was just decorative, ate vertical space, and during transitions
          briefly rendered as a centered overlay before settling — bad UX
          on cold start. Landing is the post-unlock root with no back nav,
          so a header gives nothing back. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.avatarButton, { borderColor: primaryColor }]}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
          >
            {userAvatarEmoji ? (
              <Text style={styles.avatarEmoji}>{userAvatarEmoji}</Text>
            ) : (
              <MaterialIcons name="account-circle" size={36} color={primaryColor} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.welcomeText} numberOfLines={1}>
              Your identity
            </Text>
            <Text style={styles.userName} numberOfLines={1}>
              {activeAccount
                ? `${activeAccount.address.slice(0, 8)}...${activeAccount.address.replace('=', '').slice(-8)}`
                : `${name} Wallet`}
            </Text>
            {activeIdentity?.did ? (
              <View style={styles.didLine}>
                <Text
                  style={styles.didLineText}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {activeIdentity.did}
                </Text>
                <TouchableOpacity
                  hitSlop={10}
                  onPress={async () => {
                    if (!activeIdentity.did) return;
                    await Clipboard.setStringAsync(activeIdentity.did);
                    Alert.alert('Copied', 'DID copied to clipboard.');
                  }}
                >
                  <MaterialIcons name="content-copy" size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/scan')}>
            <MaterialIcons name="qr-code-scanner" size={28} color={primaryColor} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!activeAccount}
          onPress={() =>
            activeAccount &&
            router.push({
              pathname: '/account-details',
              params: { address: activeAccount.address },
            })
          }
          style={[styles.balanceCard, { backgroundColor: primaryColor }]}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <TouchableOpacity
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation?.();
                toggleBalanceHidden();
              }}
            >
              <MaterialIcons
                name={balanceHidden ? 'visibility-off' : 'visibility'}
                size={20}
                color="rgba(255, 255, 255, 0.85)"
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            {balanceHidden
              ? '••••••'
              : activeAccount
                ? `$${activeAccount.balance.toString()}`
                : '$0.00'}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="call-received" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Receive</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <MaterialIcons name="swap-horiz" size={20} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Swap</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {(showAccounts || showPasskeys || showIdentities || showConnections) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Provider Services</Text>
            </View>
            <View style={styles.serviceGrid}>
              {showAccounts && (
                <TouchableOpacity
                  style={styles.serviceItem}
                  onPress={() => router.push('/accounts')}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: secondaryColor }]}>
                    <MaterialIcons name="account-balance-wallet" size={28} color={primaryColor} />
                  </View>
                  <Text style={styles.serviceLabel}>Accounts</Text>
                  <Text style={styles.serviceSubLabel}>{accounts.length} Total</Text>
                </TouchableOpacity>
              )}
              {showPasskeys && (
                <TouchableOpacity
                  style={styles.serviceItem}
                  onPress={() => router.push('/passkeys')}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: '#ECFDF5' }]}>
                    <MaterialIcons name="fingerprint" size={28} color="#10B981" />
                  </View>
                  <Text style={styles.serviceLabel}>Passkeys</Text>
                  <Text style={styles.serviceSubLabel}>{passkeys.length} Total</Text>
                </TouchableOpacity>
              )}
              {showIdentities && (
                <TouchableOpacity
                  style={styles.serviceItem}
                  onPress={() => router.push('/identities')}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: '#FDF2F2' }]}>
                    <MaterialIcons name="person" size={28} color="#EF4444" />
                  </View>
                  <Text style={styles.serviceLabel}>Identities</Text>
                  <Text style={styles.serviceSubLabel}>{identities.length} Total</Text>
                </TouchableOpacity>
              )}
              {showConnections && (
                <TouchableOpacity
                  style={styles.serviceItem}
                  onPress={() => router.push('/connections')}
                >
                  <View style={[styles.serviceIcon, { backgroundColor: '#F1F5F9' }]}>
                    <MaterialIcons name="link" size={28} color="#64748B" />
                  </View>
                  <Text style={styles.serviceLabel}>Connections</Text>
                  <Text style={styles.serviceSubLabel}>{sessions.length} Total</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.serviceItem}
                onPress={() => router.push('/vcs')}
              >
                <View style={[styles.serviceIcon, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialIcons name="verified-user" size={28} color="#D97706" />
                </View>
                <Text style={styles.serviceLabel}>Credentials</Text>
                <Text style={styles.serviceSubLabel}>{vcEntries.length} Total</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.serviceItem}
                onPress={() => router.push('/signatures')}
              >
                <View style={[styles.serviceIcon, { backgroundColor: '#EDE9FE' }]}>
                  <MaterialIcons name="draw" size={28} color="#7C3AED" />
                </View>
                <Text style={styles.serviceLabel}>Signatures</Text>
                <Text style={styles.serviceSubLabel}>
                  {signatureEntries.length} Total
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
          </View>
          <View style={styles.activityCard}>
            {recentActivity.length === 0 ? (
              <View style={styles.activityItem}>
                <View style={[styles.activityIcon, { backgroundColor: '#F1F5F9' }]}>
                  <MaterialIcons name="history" size={20} color="#64748B" />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityTitle}>No activity yet</Text>
                  <Text style={styles.activityTime}>
                    Things you do show up here.
                  </Text>
                </View>
              </View>
            ) : (
              recentActivity.map((entry) => {
                const visual = activityVisualFor(entry.kind);
                const subtitle = resolveActivitySubtitle(entry, sessions);
                return (
                  <View key={entry.id} style={styles.activityItem}>
                    <View
                      style={[
                        styles.activityIcon,
                        { backgroundColor: visual.bg },
                      ]}
                    >
                      <MaterialIcons
                        name={visual.icon}
                        size={20}
                        color={visual.color}
                      />
                    </View>
                    <View style={styles.activityDetails}>
                      <Text style={styles.activityTitle} numberOfLines={1}>
                        {entry.title}
                      </Text>
                      <Text style={styles.activityTime} numberOfLines={1}>
                        {subtitle ?? formatRelative(entry.ts)}
                      </Text>
                    </View>
                    <Text style={styles.activityTime}>
                      {formatRelative(entry.ts)}
                    </Text>
                  </View>
                );
              })
            )}
            <TouchableOpacity
              style={styles.viewAllRow}
              activeOpacity={0.7}
              onPress={() => router.push('/activity')}
            >
              <Text style={[styles.viewAllText, { color: primaryColor }]}>
                View all activity
              </Text>
              <MaterialIcons name="chevron-right" size={18} color={primaryColor} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <WelcomeModal />
    </SafeAreaView>
  );
}

type ActivityKind = ActivityEntry['kind'];

interface ActivityVisual {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  color: string;
  bg: string;
}

function activityVisualFor(kind: ActivityKind): ActivityVisual {
  switch (kind) {
    case 'app.unlocked':
      return { icon: 'lock-open', color: '#10B981', bg: '#ECFDF5' };
    case 'app.reset':
      return { icon: 'restart-alt', color: '#EF4444', bg: '#FEF2F2' };
    case 'account.added':
    case 'account.removed':
      return { icon: 'account-balance-wallet', color: '#3B82F6', bg: '#E1EFFF' };
    case 'identity.added':
    case 'identity.removed':
      return { icon: 'person', color: '#EF4444', bg: '#FDF2F2' };
    case 'passkey.added':
    case 'passkey.removed':
      return { icon: 'fingerprint', color: '#10B981', bg: '#ECFDF5' };
    case 'connection.paired':
    case 'connection.connected':
      return { icon: 'link', color: '#10B981', bg: '#ECFDF5' };
    case 'connection.disconnected':
    case 'connection.removed':
      return { icon: 'link-off', color: '#EF4444', bg: '#FEF2F2' };
    case 'signing.received':
      return { icon: 'edit', color: '#3B82F6', bg: '#E1EFFF' };
    case 'signing.approved':
      return { icon: 'check-circle', color: '#10B981', bg: '#ECFDF5' };
    case 'signing.rejected':
      return { icon: 'cancel', color: '#EF4444', bg: '#FEF2F2' };
    case 'vc.issued':
      return { icon: 'verified-user', color: '#D97706', bg: '#FEF3C7' };
    case 'vc.removed':
      return { icon: 'verified-user', color: '#94A3B8', bg: '#F1F5F9' };
    default:
      return { icon: 'history', color: '#64748B', bg: '#F1F5F9' };
  }
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}

interface SessionLite {
  id: string;
  origin: string;
  name?: string;
}

/**
 * Pick the most informative subtitle for an activity entry. For
 * connection-related events (the `connection.*` family), prefer the
 * user's custom name on the matching session if it exists; fall back to
 * the raw origin URL stored at write time. For non-connection entries,
 * pass through the entry's own subtitle unchanged.
 *
 * Resolved at render so a later session-rename retroactively updates how
 * old entries display — names aren't frozen into the activity log.
 */
function resolveActivitySubtitle(
  entry: ActivityEntry,
  sessions: ReadonlyArray<SessionLite>,
): string | undefined {
  if (!entry.kind.startsWith('connection.')) {
    return entry.subtitle;
  }
  const origin =
    typeof entry.meta?.origin === 'string'
      ? entry.meta.origin
      : entry.subtitle ?? '';
  const requestId =
    typeof entry.meta?.requestId === 'string' ? entry.meta.requestId : null;
  if (origin && requestId) {
    const matched = sessions.find(
      (s) => s.origin === origin && s.id === requestId,
    );
    const name = matched?.name?.trim();
    if (name) return name;
  }
  return entry.subtitle ?? origin;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  didLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  didLineText: {
    flex: 1,
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#64748B',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  serviceItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  serviceSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  activityTime: {
    fontSize: 12,
    color: '#94A3B8',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewAllRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
    gap: 2,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
