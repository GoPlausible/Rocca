import { useState } from 'react';
import { Redirect } from 'expo-router';
import { useProvider } from '@/hooks/useProvider';
import { LockScreen } from '@/components/LockScreen';

export default function Index() {
  const { keys, status } = useProvider();
  const [unlocked, setUnlocked] = useState(false);

  if (status === 'loading') return null;
  if (keys.length === 0) return <Redirect href="/onboarding" />;

  // Wallet exists — gate access behind a biometric / device-credential
  // unlock. Once unlocked for this app session, redirect through to landing.
  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />;
  return <Redirect href="/landing" />;
}
