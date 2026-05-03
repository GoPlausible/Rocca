import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Small "PRIMARY" pill rendered on accounts/identities derived at the
 * default HD path (account=0, index=0). Today every Rocca user has only
 * one of each, so the pill appears on the only row in each list — but
 * once wallet plumbing introduces sibling derivations, the pill marks
 * which one is the original.
 */
export interface PrimaryBadgeProps {
  /** "compact" for list rows, "hero" for detail card hero. */
  variant?: 'compact' | 'hero';
}

export function PrimaryBadge({
  variant = 'compact',
}: PrimaryBadgeProps): React.JSX.Element {
  const isHero = variant === 'hero';
  return (
    <View style={[styles.pill, isHero ? styles.pillHero : styles.pillCompact]}>
      <Text style={[styles.text, isHero ? styles.textHero : styles.textCompact]}>
        PRIMARY
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillCompact: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    alignSelf: 'flex-start',
  },
  pillHero: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.45)',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  textCompact: {
    color: '#92400E',
  },
  textHero: {
    color: '#FFFFFF',
  },
});

export default PrimaryBadge;
