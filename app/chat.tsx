import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useStore } from '@tanstack/react-store';
import { messagesStore, Message } from '@/stores/messages';
import { useConnection } from '@/hooks/useConnection';
import { SigningRequestModal } from '@/dialogs/SigningRequestModal';
import { BackChip } from '@/components/BackChip';
import { MarkdownMessage } from '@/components/MarkdownMessage';
import { ConnectionLogsView } from '@/components/ConnectionLogsView';

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ origin: string; requestId: string }>();
  const [inputText, setInputText] = useState('');
  const insets = useSafeAreaInsets();
  // Reanimated's keyboard hook reads IME insets via WindowInsetsAnimationCompat,
  // which is the only API that works correctly under Android edge-to-edge mode.
  // The legacy Keyboard.addListener path doesn't fire reliably when the
  // activity stays full-bleed (which is what edgeToEdgeEnabled does).
  const keyboard = useAnimatedKeyboard();
  const padBottomKbClosed =
    Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 12) +
    (Platform.OS === 'android' ? 4 : 0);
  const padBottomKbOpen = Platform.OS === 'ios' ? 8 : 10;
  const {
    session,
    isConnected,
    connectionStatus,
    disconnectReason,
    triggerReconnect,
    send,
    lastHeartbeat,
    address,
    pendingSigningRequest,
    approveSigningRequest,
    rejectSigningRequest,
    unreadErrorCount,
    markLogsRead,
    noticeBanner,
    dismissNoticeBanner,
  } = useConnection(params.origin || '', params.requestId || '');

  const isReconnecting = connectionStatus === 'reconnecting';
  const isDisconnected = connectionStatus === 'disconnected';

  // In-place view swap. Tapping the status pill flips this to 'logs' —
  // the chat connection stays alive (no router navigation), only the
  // body content swaps between the messages FlatList and the per-
  // connection logs view. Back-chip/back-button restore 'chat'.
  const [viewMode, setViewMode] = useState<'chat' | 'logs'>('chat');

  // Android hardware back: when in logs mode, intercept and flip back to
  // chat instead of letting the router pop the screen (which would tear
  // down the connection).
  useEffect(() => {
    if (viewMode !== 'logs') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setViewMode('chat');
      return true;
    });
    return () => sub.remove();
  }, [viewMode]);

  const openLogsView = () => {
    markLogsRead();
    setViewMode('logs');
  };

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

  // Animated styles that read keyboard.height directly on the UI thread.
  // The outer container's paddingBottom equals the live IME height — this
  // pushes the FlatList + input above the keyboard with frame-perfect
  // synchronization. The input's own paddingBottom flips between
  // nav-bar-clearing (closed) and a small visual gap (open).
  const containerAnimStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));
  const inputContainerAnimStyle = useAnimatedStyle(() => ({
    paddingBottom:
      keyboard.height.value > 0 ? padBottomKbOpen : padBottomKbClosed,
  }));

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
      <MarkdownMessage variant={item.sender === 'me' ? 'mine' : 'peer'}>
        {item.text}
      </MarkdownMessage>
      <Text style={[styles.timestamp, item.sender === 'me' && styles.myTimestamp]}>
        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <Stack.Screen
        options={{
          headerTitle: () =>
            viewMode === 'logs' ? (
              <View style={styles.headerTitle}>
                <View style={styles.headerAvatar}>
                  <MaterialIcons name="receipt-long" size={18} color="#3B82F6" />
                </View>
                <Text style={styles.headerTitleText} numberOfLines={1}>
                  Connection logs
                </Text>
              </View>
            ) : (
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
          // In logs mode, BackChip flips back to the chat view in-place —
          // does NOT pop the screen, so the connection stays alive.
          headerLeft: () =>
            viewMode === 'logs' ? (
              <BackChip onPress={() => setViewMode('chat')} />
            ) : (
              <BackChip />
            ),
          headerRight: () =>
            viewMode === 'logs' ? null : (
              <TouchableOpacity
                style={styles.headerRightBadge}
                onPress={openLogsView}
                hitSlop={6}
                activeOpacity={0.75}
              >
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
                {unreadErrorCount > 0 ? (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {unreadErrorCount > 99 ? '99+' : unreadErrorCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ),
        }}
      />

      <Animated.View style={[{ flex: 1 }, containerAnimStyle]}>
        <View style={styles.messageArea}>
          {viewMode === 'logs' ? (
            <ConnectionLogsView
              origin={params.origin || ''}
              requestId={params.requestId || ''}
            />
          ) : (
            <>
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

              {/* Transient banner for warn/info notices. Errors don't
                  surface here — they bump the unread badge on the status
                  pill and persist in the logs view. Auto-dismiss timer
                  is owned by the hook. */}
              {noticeBanner && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={dismissNoticeBanner}
                  style={[
                    styles.noticeBanner,
                    noticeBanner.level === 'warn'
                      ? styles.noticeBannerWarn
                      : styles.noticeBannerInfo,
                  ]}
                >
                  <MaterialIcons
                    name={
                      noticeBanner.level === 'warn'
                        ? 'warning-amber'
                        : 'info-outline'
                    }
                    size={16}
                    color={noticeBanner.level === 'warn' ? '#92400E' : '#1E40AF'}
                  />
                  <Text
                    style={[
                      styles.noticeBannerText,
                      noticeBanner.level === 'warn'
                        ? styles.noticeBannerTextWarn
                        : styles.noticeBannerTextInfo,
                    ]}
                    numberOfLines={2}
                  >
                    {noticeBanner.message}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Frosted overlay covers the messages while the secure channel
              is still being negotiated (initial connect) or while the
              resilience layer silently retries after a death signal
              (reconnect). Lifted as soon as `isConnected` flips true.
              When the resilience layer hard-fails, status flips to
              `disconnected` and the dialog below takes over. */}
          {(connectionStatus === 'connecting' ||
            connectionStatus === 'reconnecting' ||
            connectionStatus === 'idle') && (
            <BlurView
              intensity={32}
              tint="light"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            >
              <View style={styles.connectingOverlay}>
                <View style={styles.connectingCard}>
                  <ActivityIndicator size="small" color="#3B82F6" />
                  <Text style={styles.connectingTitle}>
                    {isReconnecting ? 'Reconnecting…' : 'Connecting securely…'}
                  </Text>
                  <Text style={styles.connectingSubtitle}>
                    {isReconnecting
                      ? 'The connection dropped. Recovering automatically — no action needed.'
                      : 'Establishing the encrypted channel. Messages appear once the connection is online.'}
                  </Text>
                </View>
              </View>
            </BlurView>
          )}

          {/* Hard-failure dialog. Status reaches `disconnected` only after
              auto-retries are exhausted (3×10s peer attempts) OR the user
              hit the 30-min inactivity threshold. The blur stays underneath
              (chat content remains illegible) so messages aren't readable
              over a dead channel. */}
          {isDisconnected && (
            <BlurView
              intensity={48}
              tint="light"
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            >
              <View style={styles.disconnectedOverlay}>
                <View style={styles.disconnectedCard}>
                  <View style={styles.disconnectedIcon}>
                    <MaterialIcons
                      name={disconnectReason === 'idle' ? 'hourglass-empty' : 'wifi-off'}
                      size={28}
                      color="#EF4444"
                    />
                  </View>
                  <Text style={styles.disconnectedTitle}>
                    {disconnectReason === 'idle'
                      ? 'Chat paused'
                      : 'Connection lost'}
                  </Text>
                  <Text style={styles.disconnectedSubtitle}>
                    {disconnectReason === 'idle'
                      ? 'The chat was idle for 30 minutes and the secure channel was closed. Tap Retry to sign back in and resume.'
                      : 'Couldn’t reconnect automatically. Tap Retry to sign in again, or Exit to leave the chat.'}
                  </Text>
                  <View style={styles.disconnectedActions}>
                    <TouchableOpacity
                      style={[styles.disconnectedButton, styles.disconnectedExit]}
                      activeOpacity={0.85}
                      onPress={() => router.back()}
                    >
                      <Text style={styles.disconnectedExitText}>Exit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.disconnectedButton, styles.disconnectedRetry]}
                      activeOpacity={0.85}
                      onPress={() => triggerReconnect('network')}
                    >
                      <Text style={styles.disconnectedRetryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </BlurView>
          )}
        </View>

        {viewMode === 'chat' && (
          <Animated.View
            style={[styles.inputContainer, inputContainerAnimStyle]}
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
          </Animated.View>
        )}
      </Animated.View>
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
  messageArea: {
    flex: 1,
    overflow: 'hidden',
  },
  connectingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: 'rgba(248, 250, 252, 0.35)',
  },
  connectingCard: {
    paddingVertical: 18,
    paddingHorizontal: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 18,
    alignItems: 'center',
    maxWidth: 320,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  connectingTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  connectingSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: '#475569',
    textAlign: 'center',
  },
  disconnectedOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  disconnectedCard: {
    width: '100%',
    maxWidth: 360,
    paddingVertical: 22,
    paddingHorizontal: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  disconnectedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  disconnectedTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.2,
  },
  disconnectedSubtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    textAlign: 'center',
  },
  disconnectedActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  disconnectedButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  disconnectedExit: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disconnectedExitText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  disconnectedRetry: {
    backgroundColor: '#3B82F6',
  },
  disconnectedRetryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
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
  unreadBadge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    paddingHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  noticeBanner: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  noticeBannerWarn: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  noticeBannerInfo: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  noticeBannerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  noticeBannerTextWarn: {
    color: '#92400E',
  },
  noticeBannerTextInfo: {
    color: '#1E40AF',
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
