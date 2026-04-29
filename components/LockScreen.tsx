import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { requireBiometric, hasBiometricCapability } from '@/lib/biometric';

interface Props {
  onUnlock: () => void;
}

/**
 * Full-screen biometric lock that blocks the app on launch (and on resume
 * after background, if wired into AppState). Calls `onUnlock` once the OS
 * biometric prompt resolves successfully.
 */
export function LockScreen({ onUnlock }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);

  const tryUnlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await requireBiometric('Unlock Rocca');
      if (ok) onUnlock();
      else setError('Authentication failed. Tap to try again.');
    } finally {
      setBusy(false);
    }
  };

  // Auto-prompt on first mount; if the device has no biometric capability
  // we surface that to the user instead of looping.
  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await hasBiometricCapability();
      if (!alive) return;
      setAvailable(ok);
      if (ok) tryUnlock();
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialIcons name="fingerprint" size={56} color="#3B82F6" />
        </View>
        <Text style={styles.title}>Rocca is locked</Text>
        <Text style={styles.subtitle}>
          {available === false
            ? 'No biometric or device credential is enrolled. Set up biometrics or a device PIN to use Rocca.'
            : 'Unlock with biometrics or your device passcode to continue.'}
        </Text>

        <TouchableOpacity
          style={[styles.button, (busy || available === false) && { opacity: 0.5 }]}
          disabled={busy || available === false}
          onPress={tryUnlock}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="lock-open" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>Unlock</Text>
            </>
          )}
        </TouchableOpacity>

        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 18,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: 6,
  },
});
