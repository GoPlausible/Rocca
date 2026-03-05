import React, { useReducer, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Alert, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Logo from '../components/Logo';
import SeedPhrase from '../components/SeedPhrase';

import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as bip39 from '@scure/bip39';
import { useProvider } from '@/hooks/useProvider'
import { mnemonicToSeed, validateMnemonic } from '@scure/bip39'


// Extract provider configuration from expo-constants
const config = Constants.expoConfig?.extra?.provider || {
  name: 'Rocca',
  primaryColor: '#3B82F6',
  secondaryColor: '#E1EFFF',
};

type OnboardingStep = 'welcome' | 'generate' | 'backup' | 'verify' | 'complete' | 'import';

interface State {
  step: OnboardingStep;
  recoveryPhrase: string[] | null;
  testInput: { [key: number]: string };
}

type Action =
  | { type: 'SET_PHRASE'; phrase: string[] }
  | { type: 'SHOW_PHRASE' }
  | { type: 'VERIFY_START'; indices: number[] }
  | { type: 'VERIFY'; input: { [key: number]: string } }
  | { type: 'VERIFY_SUCCESS' }
  | { type: 'RESET' }
  | { type: 'START_IMPORT' };

const initialState: State = {
  step: 'welcome',
  recoveryPhrase: null,
  testInput: {},
};

function onboardingReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PHRASE':
      return { ...state, recoveryPhrase: action.phrase, step: 'generate' };
    case 'SHOW_PHRASE':
      return { ...state, step: 'backup' };
    case 'VERIFY_START':
      return {
        ...state,
        step: 'verify',
        testInput: Object.fromEntries(action.indices.map(idx => [idx, ''])),
      };
    case 'VERIFY':
      return { ...state, testInput: action.input };
    case 'VERIFY_SUCCESS':
      return {
        ...state,
        step: 'complete',
      };
    case 'RESET':
      return initialState;
    case 'START_IMPORT':
      return { ...state, step: 'import' };
    default:
      return state;
  }
}

function getIndicatorStep (step: OnboardingStep) {
  if (step === 'welcome') return 1
  if (step === 'generate') return 2
  if (step === 'backup') return 2
  if (step === 'verify') return 3
  if (step === 'complete') return 3
  return 0
}

 function getSecurityMessage(step: OnboardingStep) {
   switch (step) {
     case 'generate':
     case 'backup':
       return 'Write down these 24 words in order and store them in a safe offline place. Do not take a screenshot.'
     case 'verify':
       return 'Enter the requested words from your phrase to confirm you have a correct backup.'
     default:
       return 'Your recovery phrase is the only way to recover your wallet. Keep it secret and never share it.'
   }
 }

// Import Wallet Component
function ImportWalletScreen({ 
  primaryColor, 
  onCancel, 
  onImport 
}: { 
  primaryColor: string; 
  onCancel: () => void;
  onImport: (phrase: string[]) => void;
}) {
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleImport = async () => {
    // Parse the input - split by spaces or newlines
    const words = importText
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0);
    
    if (words.length !== 24) {
      Alert.alert(
        'Invalid Phrase',
        `Expected 24 words, but found ${words.length}. Please enter your complete recovery phrase.`
      );
      return;
    }

    // Validate using BIP39
    const phrase = words.join(' ');
    const isValid = validateMnemonic(phrase, wordlist);
    
    if (!isValid) {
      Alert.alert(
        'Invalid Recovery Phrase',
        'The recovery phrase you entered is not valid. Please check your words and try again.'
      );
      return;
    }

    setIsImporting(true);
    
    // Small delay to show loading state
    setTimeout(() => {
      onImport(words);
      setIsImporting(false);
    }, 500);
  };

  return (
    <View style={styles.importContainer}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.importHeader}>
          <MaterialIcons name="file-download" size={48} color={primaryColor} />
          <Text style={styles.importTitle}>Import Wallet</Text>
          <Text style={styles.importSubtitle}>
            Enter your 24-word recovery phrase to restore your wallet
          </Text>
        </View>

        <View style={styles.importInputContainer}>
          <Text style={styles.importLabel}>Recovery Phrase (24 words)</Text>
          <TextInput
            style={styles.importTextInput}
            multiline
            numberOfLines={8}
            placeholder="Enter your 24-word recovery phrase here...&#10;word1 word2 word3 ..."
            placeholderTextColor="#94A3B8"
            value={importText}
            onChangeText={setImportText}
            autoCapitalize="none"
            autoCorrect={false}
            textAlignVertical="top"
          />
          <Text style={styles.importHelper}>
            Words entered: {importText.split(/\s+/).filter(w => w.length > 0).length} / 24
          </Text>
        </View>

        <View style={styles.importInfo}>
          <MaterialIcons name="info" size={20} color="#64748B" />
          <Text style={styles.importInfoText}>
            Your recovery phrase is only used to restore your wallet locally. 
            It is never sent to any server.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={onCancel}
          disabled={isImporting}
        >
          <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>Cancel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: primaryColor, opacity: isImporting ? 0.7 : 1 }]}
          onPress={handleImport}
          disabled={isImporting}
        >
          <Text style={styles.primaryButtonText}>
            {isImporting ? 'Importing...' : 'Import Wallet'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  // UI Elements
  const { primaryColor, secondaryColor, name } = config
  const scrollViewRef = useRef<ScrollView>(null)

  // Expo Router for Navigation
  const router = useRouter()
  // Provider Context, used to hold global states and interfaces
  const { keys, key } = useProvider()
  // State reducer
  const [{ step, recoveryPhrase, testInput }, dispatch] =
    useReducer(onboardingReducer, initialState)

  // Helpers for state
  const currentIndicatorStep = getIndicatorStep(step)
  const securityMessage = getSecurityMessage(step)
  const isBackupVerified = step === 'complete'
  const isPhraseVisible = step === 'backup'
  const showTest = step === 'verify'
  const isImportStep = step === 'import'

  const handleImportWallet = async (words: string[]) => {
    try {
      // Import to the keystore
      const seedId = await key.store.import(
        {
          type: 'hd-seed',
          algorithm: 'raw',
          extractable: true,
          keyUsages: ['deriveKey', 'deriveBits'],
          privateKey: await mnemonicToSeed(words.join(' ')),
        },
        'bytes'
      );

      // Generate HD Root Key
      const rootKeyId = await key.store.generate({
        type: 'hd-root-key',
        algorithm: 'raw',
        extractable: true,
        keyUsages: ['deriveKey', 'deriveBits'],
        params: {
          parentKeyId: seedId
        }
      })

      // Generate Ed25519 Account Key
      await key.store.generate({
        type: 'hd-derived-ed25519',
        algorithm: 'EdDSA',
        extractable: true,
        keyUsages: ['sign', "verify"],
        params: {
          parentKeyId: rootKeyId,
          context: 0,
          account: 0,
          index: 0,
          derivation: 9
        }
      })

      // Generate Ed25519 Identity Key
      await key.store.generate({
        type: 'hd-derived-ed25519',
        algorithm: 'EdDSA',
        extractable: true,
        keyUsages: ['sign', "verify"],
        params: {
          parentKeyId: rootKeyId,
          context: 1,
          account: 0,
          index: 0,
          derivation: 9
        }
      })

      router.replace('/landing');
    } catch (error) {
      console.error('Import failed:', error);
      Alert.alert(
        'Import Failed',
        'Failed to import wallet. Please check your recovery phrase and try again.'
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerIndicator}>
        {/* Step Indicator */}
        {currentIndicatorStep > 0 && !isImportStep && (
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  currentIndicatorStep === s && [styles.stepDotActive, { backgroundColor: primaryColor }],
                  currentIndicatorStep > s && [styles.stepDotCompleted, { backgroundColor: secondaryColor }],
                ]}
              />
            ))}
            <Text style={styles.stepText}>Step {currentIndicatorStep} of 3</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {step === 'welcome' ? (
          /* Step 1: Welcome */
          <View style={styles.welcomeContainer}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.welcomeHeader}>
                <Logo style={styles.logoContainer} size={80} />
                <Text style={styles.title}>Welcome to {name}</Text>
                <Text style={styles.subtitle}>
                  Your secure, decentralized identity for accessing rewards and managing digital assets.
                </Text>
              </View>

              <View style={styles.illustrationContainer}>
                <Image
                  source={require('../assets/images/onboarding.png')}
                  style={styles.onboardingGraphic}
                  resizeMode="contain"
                />
              </View>
            </ScrollView>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                onPress={() => {
                  if (keys.length > 0) {
                    router.replace('/landing')
                    return
                  }

                  // Update onboarding to include the text, this is used to validate the list
                  const phrase = bip39.generateMnemonic(wordlist, 256).split(' ')
                  dispatch({ type: 'SET_PHRASE', phrase })

                  // Scroll to the button once generation is complete
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true })
                  }, 100)
                }}
              >
                <Text style={styles.primaryButtonText}>Create Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => dispatch({ type: 'START_IMPORT' })}
              >
                <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>Import Existing Wallet</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isImportStep ? (
          /* Import Wallet Flow */
          <ImportWalletScreen
            primaryColor={primaryColor}
            onCancel={() => dispatch({ type: 'RESET' })}
            onImport={handleImportWallet}
          />
        ) : (
          /* Step 2: Secure Your Identity (Generating, Backup, Verify) */
          <View style={styles.onboardingContainer}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Secure Your Identity.</Text>
              </View>

              <View style={styles.illustrationContainer}>
                <Logo size={100} />
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>
                  {isBackupVerified
                      ? 'Identity Secured!'
                      : 'Secure Your Recovery Phrase'}
                </Text>

                {isBackupVerified ? (
                  <Animated.View entering={FadeIn.duration(400)} style={styles.successAnimation}>
                    <View style={[styles.successCircle, { backgroundColor: primaryColor }]}>
                      <MaterialIcons name="check" size={60} color="#FFFFFF" />
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View
                    key={step}
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(400)}
                    style={styles.securityWarning}
                  >
                    <MaterialIcons name="security" size={20} color={primaryColor} />
                    <Text style={styles.securityWarningText}>{securityMessage}</Text>
                  </Animated.View>
                )}
              </View>

              {!isBackupVerified && (
                <>
                  <SeedPhrase
                    recoveryPhrase={recoveryPhrase || []}
                    showSeed={isPhraseVisible}
                    validateWords={showTest ? testInput : null}
                    onInputChange={(index, text) =>
                      dispatch({ type: 'VERIFY', input: { ...testInput, [index]: text } })
                    }
                    primaryColor={primaryColor}
                  />
                </>
              )}
            </ScrollView>

            {!isBackupVerified && (
              <View style={styles.buttonContainer}>
                {(() => {
                  switch (step) {
                    case 'generate':
                      return (
                        <>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => dispatch({ type: 'RESET' })}
                          >
                            <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>Go Back</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                            onPress={() => dispatch({ type: 'SHOW_PHRASE' })}
                          >
                            <Text style={styles.primaryButtonText}>View Secret</Text>
                          </TouchableOpacity>
                        </>
                      );
                    case 'backup':
                      return (
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                          onPress={() => {
                            // TODO: randomize
                            const indices = [3, 7, 15, 21];
                            dispatch({ type: 'VERIFY_START', indices });
                          }}
                        >
                          <Text style={styles.primaryButtonText}>Verify Recovery Phrase</Text>
                        </TouchableOpacity>
                      );
                    case 'verify':
                      return (
                        <>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => dispatch({ type: 'RESET' })}
                          >
                            <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>Reset Onboarding</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                            onPress={async () => {
                              const isCorrect = Object.entries(testInput).every(
                                ([index, value]) => value.toLowerCase().trim() === recoveryPhrase?.[Number(index)]
                              );
                              if (isCorrect) {
                                dispatch({ type: 'VERIFY_SUCCESS' });
                                if (recoveryPhrase === null) {
                                  throw new Error('Recovery phrase is null');
                                }

                                // Import to the keystore
                                const seedId = await key.store.import(
                                  {
                                    type: 'hd-seed',
                                    algorithm: 'raw',
                                    extractable: true,
                                    keyUsages: ['deriveKey', 'deriveBits'],
                                    privateKey: await mnemonicToSeed(recoveryPhrase.join(' ')),
                                  },
                                  'bytes'
                                );

                                // Generate HD Root Key
                                const rootKeyId = await key.store.generate({
                                  type: 'hd-root-key',
                                  algorithm: 'raw',
                                  extractable: true,
                                  keyUsages: ['deriveKey', 'deriveBits'],
                                  params: {
                                    parentKeyId: seedId
                                  }
                                })

                                // Generate Ed25519 Account Key
                                await key.store.generate({
                                  type: 'hd-derived-ed25519',
                                  algorithm: 'EdDSA',
                                  extractable: true,
                                  keyUsages: ['sign', "verify"],
                                  params: {
                                    parentKeyId: rootKeyId,
                                    context: 0,
                                    account: 0,
                                    index: 0,
                                    derivation: 9
                                  }
                                })

                                // Generate Ed25519 Identity Key
                                await key.store.generate({
                                  type: 'hd-derived-ed25519',
                                  algorithm: 'EdDSA',
                                  extractable: true,
                                  keyUsages: ['sign', "verify"],
                                  params: {
                                    parentKeyId: rootKeyId,
                                    context: 1,
                                    account: 0,
                                    index: 0,
                                    derivation: 9
                                  }
                                })

                                router.replace('/landing');

                              } else {
                                Alert.alert(
                                  'Verification Failed',
                                  "The words you entered don't match your recovery phrase. Would you like to try again or start over?",
                                  [
                                    { text: 'Try Again', style: 'cancel' },
                                    { text: 'Start Over', onPress: () => dispatch({ type: 'RESET' }), style: 'destructive' },
                                  ]
                                );
                              }
                            }}
                          >
                            <Text style={styles.primaryButtonText}>Check Words</Text>
                          </TouchableOpacity>
                        </>
                      );
                    default:
                      return (
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                          onPress={() => router.replace('/landing')}
                        >
                          <Text style={styles.primaryButtonText}>Complete onboarding</Text>
                        </TouchableOpacity>
                      );
                  }
                })()}
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  headerIndicator: {
    paddingTop: 10,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  stepDotActive: {
    width: 24,
  },
  stepDotCompleted: {
    backgroundColor: '#93C5FD',
  },
  stepText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  onboardingContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    minHeight: 150,
  },
  onboardingGraphic: {
    width: '100%',
    height: 250,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  successAnimation: {
    marginVertical: 20,
    alignItems: 'center',
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 5,
    gap: 10,
  },
  securityWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 20,
    paddingBottom: 10,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Import Wallet Styles
  importContainer: {
    flex: 1,
  },
  importHeader: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
  },
  importTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
    marginBottom: 8,
  },
  importSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  importInputContainer: {
    marginBottom: 20,
  },
  importLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  importTextInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    minHeight: 180,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
  },
  importHelper: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'right',
  },
  importInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F1F5F9',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 12,
  },
  importInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
});
