import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * User-set display overrides (custom name + emoji avatar) for entities the
 * underlying stores expose with cryptographic-but-unfriendly identifiers
 * (account addresses, passkey credential IDs, identity DIDs).
 *
 * Mirrors how Connections (`sessionsStore`) lets the user override the
 * `origin` display with a friendly `name`/`avatar`. The labels here live
 * separately from the source-of-truth stores so they survive even if the
 * underlying entity is removed and re-added.
 */
export type LabelEntityType = 'accounts' | 'passkeys' | 'identities';

export interface Label {
  name?: string;
  avatar?: string;
}

export interface LabelsState {
  /** Keyed by `<entityType>:<id>`. */
  byKey: Record<string, Label>;
}

const STORAGE_KEY = 'labels';
const storage = createMMKV({ id: 'labels' });

const labelKey = (type: LabelEntityType, id: string): string => `${type}:${id}`;

const loadInitial = (): LabelsState => {
  try {
    const raw = storage.getString(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LabelsState>;
      if (parsed && typeof parsed.byKey === 'object' && parsed.byKey !== null) {
        return { byKey: parsed.byKey as Record<string, Label> };
      }
    }
  } catch (err) {
    console.error('Failed to load labels:', err);
  }
  return { byKey: {} };
};

export const labelsStore = new Store<LabelsState>(loadInitial());

labelsStore.subscribe(() => {
  try {
    storage.set(STORAGE_KEY, JSON.stringify(labelsStore.state));
  } catch (err) {
    console.error('Failed to save labels:', err);
  }
});

export function getLabel(type: LabelEntityType, id: string): Label | undefined {
  return labelsStore.state.byKey[labelKey(type, id)];
}

export function setLabel(type: LabelEntityType, id: string, label: Label): void {
  const k = labelKey(type, id);
  // Drop empty strings so the override genuinely "clears" rather than
  // shadowing the source-of-truth value with whitespace.
  const next: Label = {};
  if (label.name && label.name.trim().length > 0) next.name = label.name.trim();
  if (label.avatar && label.avatar.length > 0) next.avatar = label.avatar;
  labelsStore.setState((s) => {
    const byKey = { ...s.byKey };
    if (next.name === undefined && next.avatar === undefined) {
      delete byKey[k];
    } else {
      byKey[k] = next;
    }
    return { byKey };
  });
}

export function clearLabel(type: LabelEntityType, id: string): void {
  labelsStore.setState((s) => {
    const byKey = { ...s.byKey };
    delete byKey[labelKey(type, id)];
    return { byKey };
  });
}
