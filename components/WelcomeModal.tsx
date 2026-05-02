import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Module-level flag — flipped true after the modal first shows in this
// process. Re-mounts of LandingScreen (e.g. navigating back from chat)
// don't re-trigger it; only a fresh cold start does.
let shownThisSession = false;

const ENHANCEMENTS = [
  'Made ready for agentic communications',
  'Uses SDKs from GoPlausible',
  'Enhanced UI/UX',
  'Uses WebSockets instead of SocketIO for cloud compatibility',
  'Add Biometrics support',
  'Add chat protection',
  'Add account, identity, passkey and credentials details',
  'Add history',
  'Add Verifiable Credentials',
  'Add DIDCOM messaging over WebRTC',
];

export function WelcomeModal(): React.JSX.Element | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shownThisSession) {
      shownThisSession = true;
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.logoBubble}>
              <MaterialIcons name="waving-hand" size={26} color="#3B82F6" />
            </View>
            <Text style={styles.title}>Rocca Wallet</Text>
            <Text style={styles.subtitle}>
              by Algorand Foundation, enhanced by GoPlausible.
            </Text>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.bodyIntro}>
              This fork of Rocca by GoPlausible differs from the original by:
            </Text>
            {ENHANCEMENTS.map((line) => (
              <View key={line} style={styles.bullet}>
                <MaterialIcons
                  name="check-circle"
                  size={16}
                  color="#10B981"
                  style={styles.bulletIcon}
                />
                <Text style={styles.bulletText}>{line}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={styles.cta}
            activeOpacity={0.85}
            onPress={() => setVisible(false)}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 22,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  logoBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: 4,
  },
  bodyIntro: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 10,
  },
  bullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletIcon: {
    marginTop: 2,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: '#1E293B',
  },
  cta: {
    marginTop: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
