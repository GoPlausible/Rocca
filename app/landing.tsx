import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import {useProvider} from "@/hooks/useProvider";
import type { DIDDocument } from "@/extensions/identities/did-document";

// Extract provider configuration from expo-constants
const config = Constants.expoConfig?.extra?.provider || {
  name: 'Rocca',
  primaryColor: '#3B82F6',
  secondaryColor: '#E1EFFF',
  accentColor: '#10B981',
  welcomeMessage: 'Your identity, rewarded.',
  showRewards: true,
  showFeeDelegation: true,
  showIdentityManagement: true,
};

interface DidDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  didDocument: DIDDocument | undefined;
  primaryColor: string;
}

function DidDocumentModal({ visible, onClose, didDocument, primaryColor }: DidDocumentModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>DID Document</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            {didDocument ? (
              <View>
                <Text style={styles.docLabel}>@context:</Text>
                {didDocument['@context'].map((ctx, index) => (
                  <Text key={index} style={styles.docValue}>{ctx}</Text>
                ))}
                
                <Text style={styles.docLabel}>id:</Text>
                <Text style={styles.docValue}>{didDocument.id}</Text>
                
                <Text style={styles.docLabel}>verificationMethod:</Text>
                {didDocument.verificationMethod.map((method, index) => (
                  <View key={index} style={styles.verificationMethod}>
                    <Text style={styles.docSubLabel}>  id: {method.id}</Text>
                    <Text style={styles.docSubLabel}>  type: {method.type}</Text>
                    <Text style={styles.docSubLabel}>  controller: {method.controller}</Text>
                    <Text style={styles.docSubLabel}>  publicKeyMultibase: {method.publicKeyMultibase}</Text>
                  </View>
                ))}
                
                <Text style={styles.docLabel}>authentication:</Text>
                {didDocument.authentication.map((auth, index) => (
                  <Text key={index} style={styles.docValue}>{auth}</Text>
                ))}
                
                <Text style={styles.docLabel}>assertionMethod:</Text>
                {didDocument.assertionMethod.map((method, index) => (
                  <Text key={index} style={styles.docValue}>{method}</Text>
                ))}
              </View>
            ) : (
              <Text style={styles.noDocText}>No DID Document available</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function LandingScreen() {
  const router = useRouter();
  const {key, identity, account, identities, accounts} = useProvider()
  const [modalVisible, setModalVisible] = useState(false);

  const activeIdentity = identities[0];
  const activeAccount = accounts[0];

  const {
    name,
    primaryColor,
    secondaryColor,
    accentColor,
    welcomeMessage,
    showRewards,
    showFeeDelegation,
    showIdentityManagement,
  } = config;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Logo size={40} />
            <View>
              <Text style={styles.welcomeText}>{welcomeMessage}</Text>
              <Text style={styles.userName}>{activeAccount ? `${activeAccount.address.slice(0, 8)}...${activeAccount.address.replace('=', '').slice(-8)}` : `${name} Wallet`}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <MaterialIcons name="account-circle" size={32} color={primaryColor} />
          </TouchableOpacity>
        </View>

        <View style={[styles.balanceCard, { backgroundColor: primaryColor }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <MaterialIcons name="visibility" size={20} color="rgba(255, 255, 255, 0.6)" />
          </View>
          <Text style={styles.balanceAmount}>{activeAccount ? `$${activeAccount.balance.toString()}` : '$0.00'}</Text>
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
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Identity (DID)</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={[styles.seeAll, { color: primaryColor }]}>View Doc</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.didCard}>
            <View style={styles.didInfo}>
              <MaterialIcons name="verified" size={20} color={accentColor} />
              <Text style={[styles.didText, { flex: 1 }]} numberOfLines={1} ellipsizeMode="middle">
                {activeIdentity?.did || 'No identity found'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => alert('DID copied!')}>
              <MaterialIcons name="content-copy" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {(showRewards || showFeeDelegation || showIdentityManagement) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Provider Services</Text>
            <View style={styles.serviceGrid}>
              {showRewards && (
                <TouchableOpacity style={styles.serviceItem}>
                  <View style={[styles.serviceIcon, { backgroundColor: secondaryColor }]}>
                    <MaterialIcons name="card-giftcard" size={28} color={primaryColor} />
                  </View>
                  <Text style={styles.serviceLabel}>Rewards</Text>
                  <Text style={styles.serviceSubLabel}>340 pts</Text>
                </TouchableOpacity>
              )}
              {showFeeDelegation && (
                <TouchableOpacity style={styles.serviceItem}>
                  <View style={[styles.serviceIcon, { backgroundColor: '#ECFDF5' }]}>
                    <MaterialIcons name="local-gas-station" size={28} color="#10B981" />
                  </View>
                  <Text style={styles.serviceLabel}>Free Fees</Text>
                  <Text style={styles.serviceSubLabel}>Enabled</Text>
                </TouchableOpacity>
              )}
              {showIdentityManagement && (
                <TouchableOpacity style={styles.serviceItem}>
                  <View style={[styles.serviceIcon, { backgroundColor: '#FDF2F2' }]}>
                    <MaterialIcons name="security" size={28} color="#EF4444" />
                  </View>
                  <Text style={styles.serviceLabel}>Security</Text>
                  <Text style={styles.serviceSubLabel}>Shielded</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#F1F5F9' }]}>
                <MaterialIcons name="history" size={20} color="#64748B" />
              </View>
              <View style={styles.activityDetails}>
                <Text style={styles.activityTitle}>Onboarding Reward</Text>
                <Text style={styles.activityTime}>Just now</Text>
              </View>
              <Text style={[styles.activityAmount, { color: accentColor }]}>+50 pts</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={async () =>
              {
                await key.store.clear()
                await account.store.clear()
                await identity.store.clear()
                router.replace('/onboarding')
              }}
        >
          <Text style={styles.resetButtonText}>Logout & Reset Onboarding</Text>
        </TouchableOpacity>
      </ScrollView>

      <DidDocumentModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        didDocument={activeIdentity?.didDocument}
        primaryColor={primaryColor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
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
  balanceCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    elevation: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
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
    fontSize: 38,
    fontWeight: '800',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  didCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  didInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  didText: {
    color: '#334155',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '500',
  },
  serviceGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  serviceItem: {
    flex: 1,
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
  resetButton: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  docValue: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
  docSubLabel: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
  verificationMethod: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  noDocText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
});
