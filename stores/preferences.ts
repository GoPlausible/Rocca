import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

export interface PreferencesState {
  /** Emoji shown in landing header in place of the original R logo. */
  userAvatarEmoji: string | null;
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
        balanceHidden: parsed.balanceHidden === true,
      };
    }
  } catch (err) {
    console.error('Failed to load preferences:', err);
  }
  return { userAvatarEmoji: null, balanceHidden: false };
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
  preferencesStore.setState((s) => ({ ...s, userAvatarEmoji: emoji }));
}

export function toggleBalanceHidden() {
  preferencesStore.setState((s) => ({ ...s, balanceHidden: !s.balanceHidden }));
}
