import React from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useProvider } from '@/hooks/useProvider';

export default function PasskeysScreen() {
  const router = useRouter();
  const { passkeys } = useProvider();

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen options={{ 
        title: 'Passkeys',
        headerShown: true,
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
            <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
          </TouchableOpacity>
        ),
      }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Passkeys</Text>
          <View style={styles.list}>
            {passkeys.map((passkey, index) => (
              <View key={index} style={styles.card}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="fingerprint" size={24} color="#10B981" />
                </View>
                <View style={styles.details}>
                  <Text style={styles.credentialId} numberOfLines={1} ellipsizeMode="middle">
                    {passkey.credentialId}
                  </Text>
                  <Text style={styles.date}>Created: {new Date(passkey.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>
            ))}
            {passkeys.length === 0 && (
              <Text style={styles.emptyText}>No passkeys found</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  credentialId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
  },
});
