import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Keyboard,
  type KeyboardEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import { messagesStore, Message } from '@/stores/messages';
import { useConnection } from '@/hooks/useConnection';
import { SigningRequestModal } from '@/dialogs/SigningRequestModal';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ origin: string; requestId: string }>();
  const [inputText, setInputText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const isKeyboardOpen = keyboardHeight > 0;
  const {
    session,
    isConnected,
    send,
    lastHeartbeat,
    address,
    pendingSigningRequest,
    approveSigningRequest,
    rejectSigningRequest,
  } = useConnection(params.origin || '', params.requestId || '');

  const channelName =
    (session?.name && session.name.trim()) || params.origin || 'Chat';
  const channelAvatar = session?.avatar;
  const statusColor = isConnected ? '#10B981' : '#EF4444';

  const { messages } = useStore(messagesStore, (state) => ({
    messages: state.messages.filter(
      (m) =>
        m.origin === params.origin &&
        m.requestId === params.requestId &&
        (address ? m.address === address : true),
    ),
  }));

  const flatListRef = useRef<FlatList>(null);

  const [isHeartbeatVisible, setIsHeartbeatVisible] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setIsHeartbeatVisible(true);
      const timer = setTimeout(() => setIsHeartbeatVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastHeartbeat, isConnected]);

  // Manual keyboard tracking. We do NOT use KeyboardAvoidingView because
  // it's unreliable in Android edge-to-edge mode (its measurements get
  // wrong relative to the navigator's header). Instead we read the actual
  // keyboard height from the OS event and apply it as paddingBottom on
  // the chat container. The IME's `endCoordinates.height` already includes
  // the system nav bar overlap on Android, so this is exact.
  useEffect(() => {
    const onShow = (e: KeyboardEvent) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
      requestAnimationFrame(() =>
        flatListRef.current?.scrollToEnd({ animated: true }),
      );
    };
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      onShow,
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      onHide,
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleSend = () => {
    if (inputText.trim()) {
      send(inputText.trim());
      setInputText('');
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View
      style={[styles.messageBubble, item.sender === 'me' ? styles.myMessage : styles.peerMessage]}
    >
      <Text
        style={[
          styles.messageText,
          item.sender === 'me' ? styles.myMessageText : styles.peerMessageText,
        ]}
      >
        {item.text}
      </Text>
      <Text style={[styles.timestamp, item.sender === 'me' && styles.myTimestamp]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={styles.headerTitle}>
              <View style={styles.headerAvatar}>
                {channelAvatar ? (
                  <Text style={styles.headerAvatarEmoji}>{channelAvatar}</Text>
                ) : (
                  <MaterialIcons name="link" size={18} color="#3B82F6" />
                )}
              </View>
              <Text style={styles.headerTitleText} numberOfLines={1}>
                {channelName}
              </Text>
            </View>
          ),
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backChip}
              hitSlop={6}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chevron-left" size={26} color="#3B82F6" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={styles.headerRightBadge}>
              {isHeartbeatVisible && isConnected && (
                <MaterialIcons
                  name="favorite"
                  size={12}
                  color="#10B981"
                  style={{ marginRight: 6 }}
                />
              )}
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {isConnected ? 'Online' : 'Offline'}
              </Text>
            </View>
          ),
        }}
      />

      <View
        style={{
          flex: 1,
          // Push the entire chat (FlatList + input) up by the actual
          // keyboard height when the IME is open. Read directly from
          // Keyboard.addListener — no KeyboardAvoidingView, no offset
          // guesswork.
          paddingBottom: keyboardHeight,
        }}
      >
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <View
          style={[
            styles.inputContainer,
            {
              // Keyboard-up: small visual gap above the IME (the parent's
              // paddingBottom already places us flush against the keyboard).
              // Keyboard-down: clear the system nav bar.
              paddingBottom: isKeyboardOpen
                ? Platform.OS === 'ios'
                  ? 8
                  : 10
                : Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 12) +
                  (Platform.OS === 'android' ? 4 : 0),
            },
          ]}
        >
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
            placeholderTextColor="#94A3B8"
            editable={isConnected}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || !isConnected) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || !isConnected}
          >
            <MaterialIcons name="send" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      <SigningRequestModal
        request={pendingSigningRequest}
        onApprove={approveSigningRequest}
        onReject={rejectSigningRequest}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarEmoji: {
    fontSize: 18,
  },
  headerTitleText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
  },
  backChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  messageList: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  peerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: 'white',
  },
  peerMessageText: {
    color: '#1E293B',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    color: 'rgba(0,0,0,0.5)',
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 120,
    color: '#1E293B',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
});
