import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

export interface PreferencesState {
  /** Emoji shown in landing header in place of the original R logo. */
  userAvatarEmoji: string | null;
  /**
   * Image-based avatar — stored as a `data:image/...;base64,...` URI so the
   * picture survives cache purges and app upgrades without juggling files.
   * Setting one of (emoji | uri) clears the other; only one is active.
   */
  userAvatarUri: string | null;
  /** When true, the Total Balance hero card masks the amount. */
  balanceHidden: boolean;
}

const STORAGE_KEY = 'preferences';
const preferencesStorage = createMMKV({ id: 'preferences' });

const loadInitial = (): PreferencesState => {
  try {
    const raw = preferencesStorage.getString(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PreferencesState>;
      return {
        userAvatarEmoji: typeof parsed.userAvatarEmoji === 'string' ? parsed.userAvatarEmoji : null,
        userAvatarUri: typeof parsed.userAvatarUri === 'string' ? parsed.userAvatarUri : null,
        balanceHidden: parsed.balanceHidden === true,
      };
    }
  } catch (err) {
    console.error('Failed to load preferences:', err);
  }
  return { userAvatarEmoji: null, userAvatarUri: null, balanceHidden: false };
};

export const preferencesStore = new Store<PreferencesState>(loadInitial());

preferencesStore.subscribe(() => {
  try {
    preferencesStorage.set(STORAGE_KEY, JSON.stringify(preferencesStore.state));
  } catch (err) {
    console.error('Failed to save preferences:', err);
  }
});

export function setUserAvatarEmoji(emoji: string | null) {
  preferencesStore.setState((s) => ({
    ...s,
    userAvatarEmoji: emoji,
    userAvatarUri: emoji ? null : s.userAvatarUri,
  }));
}

export function setUserAvatarUri(uri: string | null) {
  preferencesStore.setState((s) => ({
    ...s,
    userAvatarUri: uri,
    userAvatarEmoji: uri ? null : s.userAvatarEmoji,
  }));
}

export function clearUserAvatar() {
  preferencesStore.setState((s) => ({
    ...s,
    userAvatarEmoji: null,
    userAvatarUri: null,
  }));
}

export function toggleBalanceHidden() {
  preferencesStore.setState((s) => ({ ...s, balanceHidden: !s.balanceHidden }));
}
