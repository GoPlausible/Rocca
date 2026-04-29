import React from 'react';
import { StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  /** Override default `router.back()` behavior. */
  onPress?: () => void;
  /** Tint of the chevron. Defaults to the primary blue. */
  color?: string;
  /** Extra style on the chip wrapper. */
  style?: ViewStyle;
}

/**
 * Beautified back button used in every screen header. Rounded grey chip
 * with a centered chevron — replaces the default `arrow-back` material
 * icon for a consistent look across the app.
 */
export function BackChip({ onPress, color = '#3B82F6', style }: Props) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={onPress ?? (() => router.back())}
      style={[styles.chip, style]}
      hitSlop={6}
      activeOpacity={0.7}
    >
      <MaterialIcons name="chevron-left" size={26} color={color} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
