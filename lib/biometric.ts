import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

/**
 * Returns true if the device has hardware support AND the user has enrolled
 * at least one biometric or device credential. Does NOT trigger any prompt.
 */
export async function hasBiometricCapability(): Promise<boolean> {
  try {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    if (!hasHw) return false;
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch {
    return false;
  }
}

/**
 * Trigger an OS biometric prompt. Returns true on success, false on user
 * cancel / lockout / unrecognized / no-hardware. Falls back to device
 * passcode where the OS supports it.
 *
 * Use this BEFORE every privileged operation that the broken
 * react-native-passkey-autofill activity would otherwise approve with a
 * tap-only "Sign In" button.
 */
export async function requireBiometric(reason: string): Promise<boolean> {
  if (!(await hasBiometricCapability())) {
    // Hard policy: if the device can't do biometric, we refuse the operation.
    // This matches the v0 spec's "userVerification: required" intent.
    return false;
  }
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      // iOS-only: fallback to device passcode if biometric fails
      fallbackLabel: 'Use device passcode',
      // Android: allow PIN/pattern as a fallback when biometric is unavailable
      disableDeviceFallback: false,
      // iOS: skip the system "Cancel" button label tweak
      cancelLabel: Platform.OS === 'ios' ? 'Cancel' : undefined,
    });
    return result.success === true;
  } catch (err) {
    console.warn('biometric authenticateAsync failed:', err);
    return false;
  }
}
